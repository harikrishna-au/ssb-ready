const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://stub.supabase.co';
process.env.SUPABASE_KEY = 'stub';
process.env.JWT_SECRET = 'x';

const tables = { content_wat_words: [], content_oir_questions: [], content_seen: [] };
function builder(name) {
  const st = { filters: [], op: 'select' };
  const b = {
    select: () => b,
    eq: (c, v) => { st.filters.push((r) => r[c] === v); return b; },
    neq: (c, v) => { st.filters.push((r) => r[c] !== v); return b; },
    delete: () => { st.op = 'delete'; return b; },
    upsert: (rows) => {
      for (const r of rows) {
        const i = tables[name].findIndex((x) => x.user_id === r.user_id && x.bank === r.bank && x.item_id === r.item_id);
        if (i >= 0) tables[name][i] = r; else tables[name].push(r);
      }
      return Promise.resolve({ error: null });
    },
    maybeSingle: async () => ({ data: tables[name].filter((r) => st.filters.every((f) => f(r)))[0] || null, error: null }),
    then: (res) => {
      const hit = tables[name].filter((r) => st.filters.every((f) => f(r)));
      if (st.op === 'delete') tables[name] = tables[name].filter((r) => !hit.includes(r));
      return res({ data: st.op === 'delete' ? null : hit.map((r) => ({ ...r })), error: null });
    }
  };
  return b;
}
const key = require.resolve('../config/supabase');
require.cache[key] = { id: key, filename: key, loaded: true, exports: { from: builder } };
const bank = require('../services/contentBank');

const reset = () => {
  bank._clearCache();
  tables.content_seen = [];
  tables.content_wat_words = Array.from({ length: 20 }, (_, i) => ({ id: `w${i}`, word: `Word${i}`, tags: [], difficulty: 2, active: true, review_status: i === 19 ? 'rejected' : 'approved' }));
  tables.content_oir_questions = [
    { id: 'q1', text: 'Q?', options: ['a', 'b', 'c', 'd'], correct_answer_index: 2, explanation: 'because', type: 'verbal', image_url: null, tags: [], difficulty: 2, active: true, review_status: 'approved' }
  ];
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

test('OIR questions are served without answer or explanation', async () => {
  reset();
  const r = await bank.getRandomSet({ bank: 'oir', count: 5, userId: 'u1' });
  assert.equal(r.items.length, 1);
  assert.ok(!('correct_answer_index' in r.items[0]));
  assert.ok(!('explanation' in r.items[0]));
  assert.ok(!JSON.stringify(r).includes('because'));
});

test('OIR answer check reveals the answer only on request and validates input', async () => {
  reset();
  assert.deepEqual(await bank.checkOirAnswer({ questionId: 'q1', index: 1 }), { correct: false, correctIndex: 2, explanation: 'because' });
  assert.equal((await bank.checkOirAnswer({ questionId: 'q1', index: 2 })).correct, true);
  await assert.rejects(bank.checkOirAnswer({ questionId: 'q1', index: 9 }), (e) => e.statusCode === 400);
  await assert.rejects(bank.checkOirAnswer({ questionId: 'nope', index: 0 }), (e) => e.statusCode === 404);
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
