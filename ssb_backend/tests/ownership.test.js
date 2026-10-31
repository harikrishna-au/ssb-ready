const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { makeApp, api, tokenFor, reset } = require('./helpers');

let app, call;
before(async () => { app = await makeApp(); call = api(app.url); });
after(() => app.close());
beforeEach(reset);

const alice = () => tokenFor('clerk-alice');
const bob = () => tokenFor('clerk-bob');
const tests = ['oir', 'ppdt', 'tat', 'wat', 'srt'];

// Every /api/firestore route that takes a userId must compare it to the token (ensureOwner).
for (const t of tests) {
  test(`${t}: history of another user is forbidden (403), own history is allowed`, async () => {
    assert.equal((await call('GET', `/api/firestore/${t}/history/user_alice`, { token: bob() })).status, 403);
    assert.equal((await call('GET', `/api/firestore/${t}/history/user_alice`, { token: alice() })).status, 200);
  });

  test(`${t}: saving a result for another user is forbidden (403)`, async () => {
    const body = { userId: 'user_alice', score: 5, completedAt: new Date().toISOString() };
    assert.equal((await call('POST', `/api/firestore/${t}/results`, { token: bob(), body })).status, 403);
    assert.equal((await call('POST', `/api/firestore/${t}/results`, { token: alice(), body })).status, 201);
  });

  test(`${t}: history only ever contains the caller's own documents`, async () => {
    await call('POST', `/api/firestore/${t}/results`, { token: alice(), body: { userId: 'user_alice', score: 6, completedAt: '2026-01-01T00:00:00Z' } });
    await call('POST', `/api/firestore/${t}/results`, { token: bob(), body: { userId: 'user_bob', score: 9, completedAt: '2026-01-02T00:00:00Z' } });
    const r = await call('GET', `/api/firestore/${t}/history/user_bob`, { token: bob() });
    assert.equal(r.json.data.length, 1);
    assert.equal(r.json.data[0].userId, 'user_bob');
  });
}

test('piq: reading or writing another user\'s PIQ is forbidden', async () => {
  assert.equal((await call('GET', '/api/firestore/piq/user_alice', { token: bob() })).status, 403);
  assert.equal((await call('POST', '/api/firestore/piq', { token: bob(), body: { userId: 'user_alice', fullName: 'x' } })).status, 403);
  assert.equal((await call('POST', '/api/firestore/piq', { token: alice(), body: { userId: 'user_alice', fullName: 'A' } })).status, 200);
  const r = await call('GET', '/api/firestore/piq/user_alice', { token: alice() });
  assert.equal(r.json.data.fullName, 'A');
});

test('a body without userId cannot write a result', async () => {
  const r = await call('POST', '/api/firestore/wat/results', { token: alice(), body: { score: 5 } });
  assert.ok([400, 403].includes(r.status), `got ${r.status}`);
  assert.equal((await call('GET', '/api/firestore/wat/history/user_alice', { token: alice() })).json.data.length, 0);
});

test('profile routes act only on the token owner and ignore a client-supplied id or isPremium', async () => {
  const r = await call('POST', '/api/firestore/user/profile', { token: alice(), body: { id: 'user_bob', isPremium: true, firstName: 'Al' } });
  assert.equal(r.status, 200);
  const mine = await call('GET', '/api/firestore/user/profile', { token: alice() });
  assert.equal(mine.json.data.id, 'user_alice');
  assert.equal(mine.json.data.isPremium, undefined);
  assert.equal((await call('GET', '/api/firestore/user/profile', { token: bob() })).json.data, null);
});

test('every /api/firestore route rejects unauthenticated callers', async () => {
  const routes = [
    ['GET', '/api/firestore/oir/questions'], ['GET', '/api/firestore/piq/x'], ['GET', '/api/firestore/wat/history/x'],
    ['POST', '/api/firestore/piq'], ['POST', '/api/firestore/ppdt/results'], ['GET', '/api/firestore/user/profile'], ['PATCH', '/api/firestore/user/type']
  ];
  for (const [m, p] of routes) assert.equal((await call(m, p, { body: {} })).status, 401, `${m} ${p}`);
});

test('AI, image and account routes also reject unauthenticated callers', async () => {
  const routes = [
    ['POST', '/api/evaluate/wat'], ['POST', '/api/evaluation/run'], ['POST', '/api/ppdt/pipeline'], ['POST', '/api/ppdt/ocr'],
    ['POST', '/api/tat/pipeline'], ['POST', '/api/interview/reply'], ['GET', '/api/interview/bank'], ['GET', '/api/images'],
    ['GET', '/api/account/export'], ['DELETE', '/api/account']
  ];
  for (const [m, p] of routes) assert.equal((await call(m, p, { body: {} })).status, 401, `${m} ${p}`);
});
