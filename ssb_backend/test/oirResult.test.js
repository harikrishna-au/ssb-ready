const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://stub.supabase.co';
process.env.SUPABASE_KEY = 'stub';
process.env.JWT_SECRET = 'x';

// Stub firebase db and contentBank scoring through require.cache.
const results = new Map();
const fakeDb = {
  collection: () => ({
    doc: (id) => ({
      create: async (d) => { if (results.has(id)) throw Object.assign(new Error('ALREADY_EXISTS'), { code: 6 }); results.set(id, d); }
    }),
    add: async (d) => { const id = `auto${results.size}`; results.set(id, d); return { id }; },
    orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [...results].map(([id, d]) => ({ id, data: () => d })) }) }) })
  })
};
const put = (rel, exports) => { const k = require.resolve(rel); require.cache[k] = { id: k, filename: k, loaded: true, exports }; };
put('../config/firebase', { db: fakeDb, admin: {} });
put('../config/supabase', {});
put('../services/aiService', {});
const serverScore = { score: 3, total: 10 };
put('../services/contentBank', { getOirSetScore: async ({ setId }) => { if (setId !== 'mine') throw Object.assign(new Error('nf'), { statusCode: 404 }); return serverScore; } });
const { runEvaluationPipeline } = require('../services/evaluationOrchestrator');

test('forged client score is ignored when a served set is used', async () => {
  const r = await runEvaluationPipeline('u1', 'OIR', { setId: 'mine', score: 999, totalQuestions: 999 });
  assert.equal(r.evaluation.score, 3);
  assert.equal(r.evaluation.totalQuestions, 10);
  assert.equal(r.score, 30);
});

test('the same set cannot be submitted twice', async () => {
  await assert.rejects(runEvaluationPipeline('u1', 'OIR', { setId: 'mine', score: 10, totalQuestions: 10 }), (e) => e.statusCode === 409);
});

test('someone else\'s set id is refused', async () => {
  await assert.rejects(runEvaluationPipeline('u2', 'OIR', { setId: 'theirs', score: 10, totalQuestions: 10 }), (e) => e.statusCode === 404);
});

test('legacy mobile submission without a set is bounded, flagged unverified and kept off the leaderboard', async () => {
  const r = await runEvaluationPipeline('u3', 'OIR', { score: 999, totalQuestions: 20 });
  assert.equal(r.evaluation.score, 20); // clamped to total
  const stored = [...results.values()].at(-1);
  assert.equal(stored.verified, false);
  assert.ok(r.leaderboard.every((row) => row.id !== `auto${results.size - 1}`));
});

test('unverified submissions can be switched off entirely', async () => {
  process.env.OIR_REJECT_UNVERIFIED = 'true';
  await assert.rejects(runEvaluationPipeline('u3', 'OIR', { score: 5, totalQuestions: 20 }), (e) => e.statusCode === 400);
  delete process.env.OIR_REJECT_UNVERIFIED;
});
