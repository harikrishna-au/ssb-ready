const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://stub.supabase.co';
process.env.SUPABASE_KEY = 'stub';
process.env.JWT_SECRET = 'x';

const tables = { content_wat_words: [], content_oir_questions: [], content_seen: [], content_sets: [] };
let nextSet = 1;
function builder(name) {
  const st = { filters: [], op: 'select' };
  const b = {
    select: () => b,
    eq: (c, v) => { st.filters.push((r) => r[c] === v); return b; },
    neq: (c, v) => { st.filters.push((r) => r[c] !== v); return b; },
    delete: () => { st.op = 'delete'; return b; },
    insert: (row) => { const r = { set_id: `set${nextSet++}`, answers: {}, issued_at: new Date().toISOString(), ...row }; tables[name].push(r); st.inserted = r; return b; },
    upsert: (rows) => {
      for (const r of rows) {
        const i = tables[name].findIndex((x) => x.user_id === r.user_id && x.bank === r.bank && x.item_id === r.item_id);
        if (i >= 0) tables[name][i] = r; else tables[name].push(r);
      }
      return Promise.resolve({ error: null });
    },
    maybeSingle: async () => ({ data: st.inserted || tables[name].filter((r) => st.filters.every((f) => f(r)))[0] || null, error: null }),
    then: (res) => {
      const hit = tables[name].filter((r) => st.filters.every((f) => f(r)));
      if (st.op === 'delete') tables[name] = tables[name].filter((r) => !hit.includes(r));
      return res({ data: st.op === 'delete' ? null : hit.map((r) => ({ ...r })), error: null });
    }
  };
  return b;
}
const rpc = async (fn, a) => {
  assert.equal(fn, 'content_record_answer');
  const set = tables.content_sets.find((x) => x.set_id === a.p_set && x.user_id === a.p_user);
  if (!set || new Date(set.expires_at) <= new Date() || !set.item_ids.includes(a.p_question) || set.answers[a.p_question]) return { data: false, error: null };
  set.answers[a.p_question] = { index: a.p_index, correct: a.p_correct };
  return { data: true, error: null };
};
const key = require.resolve('../config/supabase');
require.cache[key] = { id: key, filename: key, loaded: true, exports: { from: builder, rpc } };
const bank = require('../services/contentBank');

const reset = () => {
  bank._clearCache();
  tables.content_seen = [];
  tables.content_sets = [];
  tables.content_wat_words = Array.from({ length: 20 }, (_, i) => ({ id: `w${i}`, word: `Word${i}`, tags: [], difficulty: 2, active: true, review_status: i === 19 ? 'rejected' : 'approved' }));
  tables.content_oir_questions = ['q1', 'q2', 'q3'].map((id, i) => ({ id, text: `Q${i}?`, options: ['a', 'b', 'c', 'd'], correct_answer_index: 2, explanation: 'because', type: 'verbal', image_url: null, tags: [], difficulty: 2, active: true, review_status: 'approved' }));
  tables.content_oir_questions.push({ id: 'qx', text: 'rejected', options: ['a', 'b'], correct_answer_index: 0, active: true, review_status: 'rejected' });
};

test('a user never gets repeats until the bank is exhausted, and rejected items are never served', async () => {
  reset();
  const a = await bank.getRandomSet({ bank: 'wat', count: 9, userId: 'u1' });
  const b = await bank.getRandomSet({ bank: 'wat', count: 9, userId: 'u1' });
  const ids = [...a.items, ...b.items].map((i) => i.id);
  assert.equal(new Set(ids).size, 18);
  assert.ok(!ids.includes('w19'));
  assert.equal(a.repeated + b.repeated, 0);
});

test('when fewer unseen remain, the set is still full and flags repeats', async () => {
  reset();
  await bank.getRandomSet({ bank: 'wat', count: 15, userId: 'u1' });
  const c = await bank.getRandomSet({ bank: 'wat', count: 10, userId: 'u1' });
  assert.equal(c.items.length, 10);
  assert.ok(c.repeated > 0);
});

test('history is per user', async () => {
  reset();
  await bank.getRandomSet({ bank: 'wat', count: 19, userId: 'u1' });
  const other = await bank.getRandomSet({ bank: 'wat', count: 19, userId: 'u2' });
  assert.equal(other.repeated, 0);
});

test('OIR questions are served without answer or explanation, with a set id', async () => {
  reset();
  const r = await bank.getRandomSet({ bank: 'oir', count: 5, userId: 'u1' });
  assert.equal(r.items.length, 3); // the rejected one is never served
  assert.ok(r.setId);
  for (const it of r.items) { assert.ok(!('correct_answer_index' in it)); assert.ok(!('explanation' in it)); }
  assert.ok(!JSON.stringify(r).includes('because'));
});

test('OIR check: correct answer revealed only after recording, once per question', async () => {
  reset();
  const { setId } = await bank.getRandomSet({ bank: 'oir', count: 3, userId: 'u1' });
  assert.deepEqual(await bank.checkOirAnswer({ userId: 'u1', setId, questionId: 'q1', index: 1 }), { correct: false, correctIndex: 2, explanation: 'because' });
  await assert.rejects(bank.checkOirAnswer({ userId: 'u1', setId, questionId: 'q1', index: 2 }), (e) => e.statusCode === 409); // repeat
  assert.equal((await bank.checkOirAnswer({ userId: 'u1', setId, questionId: 'q2', index: 2 })).correct, true);
  await assert.rejects(bank.checkOirAnswer({ userId: 'u1', setId, questionId: 'q3', index: 9 }), (e) => e.statusCode === 400);
});

test('OIR check: unknown question id, question outside the set, and rejected question are refused', async () => {
  reset();
  const { setId } = await bank.getRandomSet({ bank: 'oir', count: 3, userId: 'u1' });
  await assert.rejects(bank.checkOirAnswer({ userId: 'u1', setId, questionId: 'nope', index: 0 }), (e) => e.statusCode === 403);
  await assert.rejects(bank.checkOirAnswer({ userId: 'u1', setId, questionId: 'qx', index: 0 }), (e) => e.statusCode === 403);
  tables.content_sets[0].item_ids.push('qx');
  await assert.rejects(bank.checkOirAnswer({ userId: 'u1', setId, questionId: 'qx', index: 0 }), (e) => e.statusCode === 404);
});

test('OIR check: another user\'s set cannot be used, and answers cannot be enumerated without a set', async () => {
  reset();
  const { setId } = await bank.getRandomSet({ bank: 'oir', count: 3, userId: 'u1' });
  await assert.rejects(bank.checkOirAnswer({ userId: 'attacker', setId, questionId: 'q1', index: 0 }), (e) => e.statusCode === 404);
  await assert.rejects(bank.checkOirAnswer({ userId: 'attacker', setId: 'set999', questionId: 'q1', index: 0 }), (e) => e.statusCode === 404);
  await assert.rejects(bank.checkOirAnswer({ userId: 'attacker', questionId: 'q1', index: 0 }), (e) => e.statusCode === 400);
});

test('OIR check: expired set is refused', async () => {
  reset();
  const { setId } = await bank.getRandomSet({ bank: 'oir', count: 3, userId: 'u1' });
  tables.content_sets[0].expires_at = new Date(Date.now() - 1000).toISOString();
  await assert.rejects(bank.checkOirAnswer({ userId: 'u1', setId, questionId: 'q1', index: 0 }), (e) => e.statusCode === 410);
});

test('OIR score comes from server-checked answers only', async () => {
  reset();
  const { setId } = await bank.getRandomSet({ bank: 'oir', count: 3, userId: 'u1' });
  await bank.checkOirAnswer({ userId: 'u1', setId, questionId: 'q1', index: 2 });
  await bank.checkOirAnswer({ userId: 'u1', setId, questionId: 'q2', index: 0 });
  assert.deepEqual(await bank.getOirSetScore({ userId: 'u1', setId }), { score: 1, total: 3, answered: 2 });
  await assert.rejects(bank.getOirSetScore({ userId: 'u2', setId }), (e) => e.statusCode === 404);
});

test('seed files parse and cover a full test', () => {
  const { rowsFor } = require('../scripts/seed_content');
  assert.ok(rowsFor('wat_words.json', 'word').length >= 60);
  assert.ok(rowsFor('srt_situations.json', 'text').length >= 60);
  assert.ok(rowsFor('lecturette_topics.json', 'topic').length >= 30);
});

test('unknown bank is a 404', async () => {
  await assert.rejects(bank.getRandomSet({ bank: 'nope', count: 1, userId: 'u' }), (e) => e.statusCode === 404);
});
