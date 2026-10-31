const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { makeApp, api, tokenFor } = require('./helpers');

let app, call;
before(async () => { app = await makeApp(); call = api(app.url); });
after(() => app.close());

const whoami = (token, headers) => call('GET', '/api/firestore/user/profile', { token, headers });

test('no token is rejected with 401', async () => {
  assert.equal((await whoami()).status, 401);
});

test('a valid Clerk session token is accepted', async () => {
  const r = await whoami(tokenFor('clerk-alice'));
  assert.equal(r.status, 200);
});

test('an expired Clerk token is rejected with 401', async () => {
  assert.equal((await whoami(tokenFor('clerk-expired'))).status, 401);
});

test('a forged Clerk-looking token (unknown signature) is rejected with 401', async () => {
  assert.equal((await whoami(tokenFor('clerk-mallory'))).status, 401);
});

test('a token claiming to be from an unrelated issuer goes to Firebase and is rejected with 401, not 500', async () => {
  const forged = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from('{"iss":"https://evil.test","sub":"user_alice"}').toString('base64url')}.`;
  const r = await whoami(forged);
  assert.equal(r.status, 401);
});

test('garbage tokens are rejected with 401', async () => {
  assert.equal((await whoami('not-a-jwt')).status, 401);
  assert.equal((await whoami('a.b.c')).status, 401);
});

test('a valid Firebase ID token (mobile app) is accepted', async () => {
  assert.equal((await whoami('fb-carol')).status, 200);
});

test('an expired Firebase ID token is rejected with 401', async () => {
  assert.equal((await whoami('fb-expired')).status, 401);
});

test('non-Bearer schemes are rejected', async () => {
  const r = await call('GET', '/api/firestore/user/profile', { headers: { Authorization: `Basic ${tokenFor('clerk-alice')}` } });
  assert.equal(r.status, 401);
});

test('error responses carry a request id and never include stack traces', async () => {
  const r = await whoami();
  assert.ok(r.headers.get('x-request-id'));
  assert.equal(r.json.error.requestId, r.headers.get('x-request-id'));
  assert.ok(!r.text.includes('at '));
});
