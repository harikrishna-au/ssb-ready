/**
 * Document storage on Supabase (Postgres): every document is a row in one table.
 *
 * It offers a small document-store API (add, get, set, query), so controllers stay simple and
 * responses keep their shape:
 *   db.collection(name).add(data)            .doc(id).get() / .set(data, { merge }) / .create() / .update() / .delete()
 *   .where(field, '==', value)  .orderBy(field, dir)  .limit(n)  .select()  .get()  db.batch()
 *
 * Only these fields can be filtered or sorted (they are real columns): userId, score, percentageScore,
 * ranked, completedAt, createdAt. Anything else throws, so a typo can never silently scan the table.
 * `merge: true` merges top-level fields (not nested maps).
 *
 * Requires the SERVICE-ROLE key. The table is private (row level security, no policies), and with the
 * public anon key reads would silently return nothing, so that key is refused loudly.
 */
const crypto = require('crypto');
const supabase = require('./supabase');
const { config } = require('./index');

const TABLE = 'app_docs';
const COLUMN = { userId: 'user_id', score: 'score', percentageScore: 'percentage_score', ranked: 'ranked', completedAt: 'completed_at', createdAt: 'created_at' };

/** The `role` claim inside a Supabase JWT key, or null when the key is not a JWT (new-style keys, test keys). */
function keyRole(key = config.supabase.key) {
  try {
    return JSON.parse(Buffer.from(String(key).split('.')[1], 'base64url').toString()).role || null;
  } catch {
    return null;
  }
}

function assertUsable() {
  if (!config.supabase.url) throw new Error('SUPABASE_URL is not set.');
  if (keyRole() === 'anon') {
    throw new Error('The backend is using the Supabase ANON key. Set SUPABASE_SERVICE_ROLE_KEY to the service-role key: the user data table is private and the anon key can read nothing from it.');
  }
}

function fail(error, what) {
  const msg = String((error && error.message) || error);
  const out = new Error(/row-level security|permission denied|not authorized/i.test(msg)
    ? `Database refused access (${what}). The backend must use the Supabase service-role key.`
    : `Database error (${what}): ${msg}`);
  out.cause = error;
  throw out;
}

const column = (field) => {
  const c = COLUMN[field];
  if (!c) throw new Error(`db: field "${field}" cannot be filtered or sorted. Allowed: ${Object.keys(COLUMN).join(', ')}`);
  return c;
};

const num = (v) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const iso = (v) => { if (v == null) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };
/** Plain JSON: Dates become ISO strings, undefined is dropped. */
const plain = (data) => JSON.parse(JSON.stringify(data ?? {}));

function promoted(d) {
  return {
    user_id: d.userId != null ? String(d.userId) : null,
    score: num(d.score),
    percentage_score: num(d.percentageScore),
    ranked: typeof d.ranked === 'boolean' ? d.ranked : null,
    completed_at: iso(d.completedAt),
    ...(iso(d.createdAt) ? { created_at: iso(d.createdAt) } : {})
  };
}

class DocSnapshot {
  constructor(ref, data) { this.ref = ref; this.id = ref.id; this.exists = data !== null && data !== undefined; this._d = data; }
  data() { return this.exists ? { ...this._d } : undefined; }
}

class DocRef {
  constructor(collection, id) { this.collection = collection; this.id = id; }

  async get() {
    assertUsable();
    const { data, error } = await supabase.from(TABLE).select('data').eq('collection', this.collection).eq('id', this.id).maybeSingle();
    if (error) fail(error, `read ${this.collection}/${this.id}`);
    return new DocSnapshot(this, data ? data.data : null);
  }

  async set(data, opts = {}) {
    assertUsable();
    let next = plain(data);
    if (opts.merge) next = { ...((await this.get()).data() || {}), ...next };
    const { error } = await supabase.from(TABLE).upsert(
      { collection: this.collection, id: this.id, data: next, updated_at: new Date().toISOString(), ...promoted(next) },
      { onConflict: 'collection,id' }
    );
    if (error) fail(error, `write ${this.collection}/${this.id}`);
  }

  /** Insert only. Fails with code 6 ("already exists") if the id is taken. */
  async create(data) {
    assertUsable();
    const next = plain(data);
    const { error } = await supabase.from(TABLE).insert({ collection: this.collection, id: this.id, data: next, ...promoted(next) });
    if (error) {
      if (error.code === '23505') throw Object.assign(new Error('Document already exists'), { code: 6 });
      fail(error, `create ${this.collection}/${this.id}`);
    }
  }

  async update(data) {
    const cur = await this.get();
    if (!cur.exists) throw Object.assign(new Error('No document to update'), { code: 5 });
    await this.set(data, { merge: true });
  }

  async delete() {
    assertUsable();
    const { error } = await supabase.from(TABLE).delete().eq('collection', this.collection).eq('id', this.id);
    if (error) fail(error, `delete ${this.collection}/${this.id}`);
  }
}

class Query {
  constructor(name, filters = [], order = null, max = null) { this.name = name; this.filters = filters; this._order = order; this._max = max; }
  doc(id) { return new DocRef(this.name, String(id)); }
  async add(data) { const ref = new DocRef(this.name, crypto.randomUUID()); await ref.create(data); return ref; }
  where(field, op, value) {
    if (op !== '==') throw new Error(`db: only "==" is supported, got "${op}"`);
    if (value === undefined) throw new Error(`db: where("${field}") needs a value`);
    return new Query(this.name, [...this.filters, [column(field), value]], this._order, this._max);
  }
  orderBy(field, dir = 'asc') { return new Query(this.name, this.filters, { col: column(field), asc: dir !== 'desc' }, this._max); }
  limit(n) { return new Query(this.name, this.filters, this._order, n); }
  select() { return this; }
  async get() {
    assertUsable();
    let q = supabase.from(TABLE).select('id, data').eq('collection', this.name);
    for (const [col, value] of this.filters) q = q.eq(col, value);
    if (this._order) q = q.order(this._order.col, { ascending: this._order.asc, nullsFirst: false });
    if (this._max) q = q.limit(this._max);
    const { data, error } = await q;
    if (error) fail(error, `query ${this.name}`);
    const docs = (data || []).map((r) => new DocSnapshot(new DocRef(this.name, r.id), r.data));
    return { docs, empty: docs.length === 0, size: docs.length, forEach: (fn) => docs.forEach(fn) };
  }
}

const db = {
  collection: (name) => new Query(String(name)),
  batch() {
    const refs = [];
    return {
      delete(ref) { refs.push(ref); },
      async commit() {
        assertUsable();
        const byCollection = new Map();
        for (const r of refs) byCollection.set(r.collection, [...(byCollection.get(r.collection) || []), r.id]);
        for (const [collection, ids] of byCollection) {
          const { error } = await supabase.from(TABLE).delete().eq('collection', collection).in('id', ids);
          if (error) fail(error, `batch delete ${collection}`);
        }
      }
    };
  }
};

module.exports = { db, keyRole, TABLE };
