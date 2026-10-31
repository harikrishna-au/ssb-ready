/** Minimal in-memory stand-in for the supabase-js query builder, enough for the payment services. */
function createFake(uniques = {}) {
  const tables = {};
  let seq = 1;
  const t = (name) => (tables[name] ||= []);

  function from(name) {
    const q = { op: 'select', filters: [], patch: null, rows: null, opts: null, order: null, lim: null, single: null };
    const match = (r) => q.filters.every((f) => f(r));
    const builder = {
      select() { return builder; },
      insert(rows) { q.op = 'insert'; q.rows = Array.isArray(rows) ? rows : [rows]; return builder; },
      upsert(rows, opts) { q.op = 'upsert'; q.rows = Array.isArray(rows) ? rows : [rows]; q.opts = opts; return builder; },
      update(patch) { q.op = 'update'; q.patch = patch; return builder; },
      eq(c, v) { q.filters.push((r) => r[c] === v); return builder; },
      in(c, vs) { q.filters.push((r) => vs.includes(r[c])); return builder; },
      gte(c, v) { q.filters.push((r) => r[c] >= v); return builder; },
      order(c, o) { q.order = [c, o && o.ascending === false ? -1 : 1]; return builder; },
      limit(n) { q.lim = n; return builder; },
      maybeSingle() { q.single = 'maybe'; return builder; },
      single() { q.single = 'one'; return builder; },
      then(res, rej) { return Promise.resolve(run()).then(res, rej); }
    };

    function violates(row, skip) {
      for (const cols of uniques[name] || []) {
        if (cols.some((c) => row[c] == null)) continue;
        if (t(name).some((r) => r !== skip && cols.every((c) => r[c] === row[c]))) return true;
      }
      return false;
    }

    function run() {
      const rows = t(name);
      if (q.op === 'insert') {
        const added = [];
        for (const r of q.rows) {
          const row = { id: seq++, created_at: new Date().toISOString(), ...r };
          if (violates(row)) return { data: null, error: { code: '23505', message: 'duplicate key' } };
          rows.push(row); added.push(row);
        }
        return { data: added, error: null };
      }
      if (q.op === 'upsert') {
        const key = q.opts && q.opts.onConflict;
        const out = [];
        for (const r of q.rows) {
          const ex = key && rows.find((x) => x[key] === r[key]);
          if (ex) { Object.assign(ex, r); out.push(ex); } else { const row = { id: seq++, ...r }; rows.push(row); out.push(row); }
        }
        return { data: out, error: null };
      }
      if (q.op === 'update') {
        const hit = rows.filter(match);
        for (const r of hit) {
          const next = { ...r, ...q.patch };
          if (violates(next, r)) return { data: null, error: { code: '23505', message: 'duplicate key' } };
        }
        hit.forEach((r) => Object.assign(r, q.patch));
        return { data: hit.map((r) => ({ ...r })), error: null };
      }
      let out = rows.filter(match).map((r) => ({ ...r }));
      if (q.order) out.sort((a, b) => (a[q.order[0]] > b[q.order[0]] ? 1 : -1) * q.order[1]);
      if (q.lim != null) out = out.slice(0, q.lim);
      if (q.single) return { data: out[0] || null, error: null };
      return { data: out, error: null };
    }
    return builder;
  }
  return { from, tables, storage: { from: () => ({ list: async () => ({ data: [], error: null }) }) } };
}

module.exports = { createFake };
