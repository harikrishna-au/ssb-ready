const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { makeApp, api, tokenFor, reset, state } = require('./helpers');

let app, call;
before(async () => { app = await makeApp(); call = api(app.url); });
after(() => app.close());
beforeEach(reset);
const token = () => tokenFor('clerk-alice');

test('malformed JSON gives 400, not 500', async () => {
  const r = await call('POST', '/api/evaluate/wat', { token: token(), raw: '{bad', headers: { 'Content-Type': 'application/json' } });
  assert.equal(r.status, 400);
});

test('bodies over the default 1mb limit are rejected with 413', async () => {
  const big = JSON.stringify({ story: 'a'.repeat(1_200_000) });
  const r = await call('POST', '/api/evaluate/ppdt', { token: token(), raw: big, headers: { 'Content-Type': 'application/json' } });
  assert.equal(r.status, 413);
});

test('stories longer than the cap are rejected before reaching the AI', async () => {
  const r = await call('POST', '/api/evaluate/ppdt', { token: token(), body: { story: 'a'.repeat(9000) } });
  assert.equal(r.status, 400);
  assert.equal(state.ai.calls.length, 0);
});

test('wrong types are rejected', async () => {
  assert.equal((await call('POST', '/api/evaluate/wat', { token: token(), body: { responses: 'nope' } })).status, 400);
  assert.equal((await call('POST', '/api/evaluate/tat', { token: token(), body: { story: 's' } })).status, 400);
  assert.equal((await call('POST', '/api/evaluation/run', { token: token(), body: {} })).status, 400);
  assert.equal((await call('POST', '/api/interview/reply', { token: token(), body: { piq: {}, chatHistory: 'x' } })).status, 400);
  assert.equal((await call('POST', '/api/data/oir/results', { token: token(), body: { userId: 'user_alice', score: 'high' } })).status, 400);
});

test('valid requests reach the AI service', async () => {
  const r = await call('POST', '/api/evaluate/wat', { token: token(), body: { responses: { 1: 'brave' } } });
  assert.equal(r.status, 200);
  assert.equal(state.ai.calls.length, 1);
});

test('unknown fields are stripped before storage (no mass assignment)', async () => {
  const r = await call('POST', '/api/data/ppdt/results', {
    token: token(),
    body: { userId: 'user_alice', userStory: 'story', isAdmin: true, premium: true, __proto__x: 1 }
  });
  assert.equal(r.status, 201);
  const stored = [...state.db.col('ppdt_results').values()][0];
  assert.equal(stored.userStory, 'story');
  assert.equal(stored.isAdmin, undefined);
  assert.equal(stored.premium, undefined);
});

test('PIQ accepts only flat primitive values and a bounded number of fields', async () => {
  assert.equal((await call('POST', '/api/data/piq', { token: token(), body: { userId: 'user_alice', fullName: { $set: 1 } } })).status, 400);
  const many = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`f${i}`, 'x']));
  assert.equal((await call('POST', '/api/data/piq', { token: token(), body: { userId: 'user_alice', ...many } })).status, 400);
});

test('DELETE /api/account needs the exact confirmation word', async () => {
  assert.equal((await call('DELETE', '/api/account', { token: token(), body: {} })).status, 400);
  assert.equal((await call('DELETE', '/api/account', { token: token(), body: { confirm: 'yes' } })).status, 400);
});

test('OCR route accepts bodies larger than 1mb (up to its own limit)', async () => {
  const r = await call('POST', '/api/ppdt/ocr', { token: token(), body: { imageBase64: 'A'.repeat(2_000_000) } });
  assert.equal(r.status, 200);
});
