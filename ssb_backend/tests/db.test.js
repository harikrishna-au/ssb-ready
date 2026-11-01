// Tests for config/db.js (the Supabase-backed document store) against an in-memory PostgREST fake.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const Module = require('module');

const jwt = (role) => `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.sig`;
process.env.LOG_SILENT = '1';
process.env.SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_KEY = jwt('service_role');
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const rows = [];
let injected = null;
function run(st) {
  if (injected) return { data: null, error: injected };
  const match = (r) => st.filters.every(([c, v]) => r[c] === v) && st.ins.every(([c, vs]) => vs.includes(r[c]));
  if (st.op === 'insert') {
    if (rows.some((r) => r.collection === st.payload.collection && r.id === st.payload.id)) return { data: null, error: { code: '23505', message: 'duplicate key value' } };
    rows.push({ ...st.payload }); return { data: null, error: null };
  }
  if (st.op === 'upsert') {
    const i = rows.findIndex((r) => r.collection === st.payload.collection && r.id === st.payload.id);
    if (i >= 0) rows[i] = { ...rows[i], ...st.payload }; else rows.push({ ...st.payload });
    return { data: null, error: null };
  }
  if (st.op === 'delete') { for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i])) rows.splice(i, 1); return { data: null, error: null }; }
  let out = rows.filter(match);
  if (st.order) {
    const [c, asc] = st.order;
    out = [...out].sort((a, b) => { const x = a[c], y = b[c]; if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1); });
  }
  if (st.limit) out = out.slice(0, st.limit);
  return st.single ? { data: out[0] || null, error: null } : { data: out.map((r) => ({ id: r.id, data: r.data })), error: null };
}
const from = () => {
  const st = { op: 'select', filters: [], ins: [], order: null, limit: null, single: false };
  const b = {
    select: () => b, eq: (c, v) => (st.filters.push([c, v]), b), in: (c, vs) => (st.ins.push([c, vs]), b),
    order: (c, o) => ((st.order = [c, o.ascending]), b), limit: (n) => ((st.limit = n), b), maybeSingle: () => ((st.single = true), b),
    insert: (p) => ((st.op = 'insert'), (st.payload = p), b), upsert: (p) => ((st.op = 'upsert'), (st.payload = p), b), delete: () => ((st.op = 'delete'), b),
    then: (res, rej) => Promise.resolve(run(st)).then(res, rej)
  };
  return b;
};
const key = Module._resolveFilename(path.resolve(__dirname, '../config/supabase.js'), module);
require.cache[key] = { id: key, filename: key, loaded: true, exports: { from } };

const { db, keyRole } = require('../config/db');
test.beforeEach(() => { rows.length = 0; injected = null; });

test('add stores a document, get reads it back, and sortable fields become columns', async () => {
  const ref = await db.collection('wat_results').add({ userId: 'u1', score: 7, completedAt: new Date('2026-11-01T10:00:00Z'), aiFeedback: 'ok' });
  assert.match(ref.id, /^[0-9a-f-]{36}$/);
  const snap = await db.collection('wat_results').doc(ref.id).get();
  assert.equal(snap.exists, true);
  assert.equal(snap.data().aiFeedback, 'ok');
  assert.equal(snap.data().completedAt, '2026-11-01T10:00:00.000Z', 'dates come back as ISO strings');
  assert.deepEqual([rows[0].user_id, rows[0].score, rows[0].completed_at], ['u1', 7, '2026-11-01T10:00:00.000Z']);
});

test('missing document: exists is false and data() is undefined', async () => {
  const snap = await db.collection('piqs').doc('nobody').get();
  assert.equal(snap.exists, false);
  assert.equal(snap.data(), undefined);
});

test('set replaces; set with merge keeps earlier fields', async () => {
  const ref = db.collection('piqs').doc('u1');
  await ref.set({ userId: 'u1', fullName: 'A', phone: '1' });
  await ref.set({ fullName: 'B' }, { merge: true });
  assert.deepEqual((await ref.get()).data(), { userId: 'u1', fullName: 'B', phone: '1' });
  await ref.set({ userId: 'u1', fullName: 'C' });
  assert.deepEqual((await ref.get()).data(), { userId: 'u1', fullName: 'C' });
  assert.equal(rows.length, 1);
});

test('create refuses a second write to the same id, with code 6', async () => {
  const ref = db.collection('oir_results').doc('set-1');
  await ref.create({ userId: 'u1', score: 3 });
  await assert.rejects(() => ref.create({ userId: 'u1', score: 9 }), (e) => e.code === 6 && /already exists/i.test(e.message));
  assert.equal((await ref.get()).data().score, 3);
});

test('history query: only this user, newest first, limit applies', async () => {
  const add = (userId, completedAt, score) => db.collection('wat_results').add({ userId, completedAt, score });
  await add('u1', '2026-11-01T08:00:00Z', 5); await add('u1', '2026-11-03T08:00:00Z', 6); await add('u2', '2026-11-04T08:00:00Z', 9); await add('u1', '2026-11-02T08:00:00Z', 7);
  const snap = await db.collection('wat_results').where('userId', '==', 'u1').orderBy('completedAt', 'desc').get();
  assert.deepEqual(snap.docs.map((d) => d.data().score), [6, 7, 5]);
  const top = await db.collection('wat_results').where('userId', '==', 'u1').orderBy('completedAt', 'desc').limit(1).get();
  assert.equal(top.size, 1);
});

test('scores sort as numbers (10 beats 9), and docs without a score go last', async () => {
  for (const s of [9, 10, 2]) await db.collection('ppdt_results').add({ userId: 'u', score: s });
  await db.collection('ppdt_results').add({ userId: 'u' });
  const snap = await db.collection('ppdt_results').orderBy('score', 'desc').limit(3).get();
  assert.deepEqual(snap.docs.map((d) => d.data().score), [10, 9, 2]);
});

test('OIR leaderboard query: ranked rows only, so unranked rows cannot crowd them out', async () => {
  await db.collection('oir_results').add({ userId: 'a', ranked: true, percentageScore: 60 });
  await db.collection('oir_results').add({ userId: 'b', ranked: false, percentageScore: 100 });
  await db.collection('oir_results').add({ userId: 'c', ranked: true, percentageScore: 80 });
  const snap = await db.collection('oir_results').where('ranked', '==', true).orderBy('percentageScore', 'desc').limit(10).get();
  assert.deepEqual(snap.docs.map((d) => d.data().userId), ['c', 'a']);
});

test('fields that are not real columns are refused instead of silently scanning', () => {
  assert.throws(() => db.collection('x').where('email', '==', 'a@b.c'), /cannot be filtered or sorted/);
  assert.throws(() => db.collection('x').orderBy('nope'), /cannot be filtered or sorted/);
  assert.throws(() => db.collection('x').where('userId', '>', 1), /only "=="/);
  assert.throws(() => db.collection('x').where('userId', '==', undefined), /needs a value/);
});

test('batch delete removes exactly the listed documents, across collections', async () => {
  const a = await db.collection('wat_results').add({ userId: 'u' });
  const b = await db.collection('srt_results').add({ userId: 'u' });
  const keep = await db.collection('wat_results').add({ userId: 'other' });
  const batch = db.batch();
  batch.delete(a); batch.delete(b);
  await batch.commit();
  assert.deepEqual(rows.map((r) => r.id), [keep.id]);
});

test('doc delete, and update on a missing document fails', async () => {
  const ref = db.collection('users').doc('u1');
  await ref.set({ id: 'u1' });
  await ref.delete();
  assert.equal((await ref.get()).exists, false);
  await assert.rejects(() => ref.update({ a: 1 }), (e) => e.code === 5);
});

test('database errors surface with a clear message; permission errors name the real fix', async () => {
  injected = { message: 'new row violates row-level security policy for table "app_docs"' };
  await assert.rejects(() => db.collection('piqs').doc('u').set({ a: 1 }), /service-role key/);
  injected = { message: 'TypeError: fetch failed' };
  await assert.rejects(() => db.collection('piqs').doc('u').get(), /Database error .*fetch failed/);
});

test('keyRole reads the role claim and returns null for non-JWT keys', () => {
  assert.equal(keyRole(jwt('anon')), 'anon');
  assert.equal(keyRole(jwt('service_role')), 'service_role');
  assert.equal(keyRole('sb_secret_abc'), null);
  assert.equal(keyRole(''), null);
});
