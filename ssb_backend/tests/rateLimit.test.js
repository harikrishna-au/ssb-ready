const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
const { createRateLimiter } = require('../middleware/rateLimit');

function run(limiter, req) {
  return new Promise((resolve) => {
    const headers = {};
    limiter(req, { setHeader: (k, v) => (headers[k] = v) }, (err) => resolve({ err, headers }));
  });
}

test('sliding window: allows max, blocks the next, allows again after the window', async () => {
  let t = 1_000_000;
  const l = createRateLimiter({ name: 't', windowMs: 10_000, max: 3, keyFn: (r) => r.k, now: () => t });
  for (let i = 0; i < 3; i++) assert.equal((await run(l, { k: 'a' })).err, undefined);
  const blocked = await run(l, { k: 'a' });
  assert.equal(blocked.err.statusCode, 429);
  assert.ok(Number(blocked.headers['Retry-After']) >= 1);
  assert.equal((await run(l, { k: 'b' })).err, undefined, 'other keys are independent');
  t += 10_001;
  assert.equal((await run(l, { k: 'a' })).err, undefined);
});

test('a missing key is not limited (the IP limiter covers unauthenticated callers)', async () => {
  const l = createRateLimiter({ name: 't', windowMs: 1000, max: 1, keyFn: () => null });
  for (let i = 0; i < 5; i++) assert.equal((await run(l, {})).err, undefined);
});

test('AI endpoints: per-user burst limit returns 429 with Retry-After, other users are unaffected', async () => {
  process.env.RATE_LIMIT_AI_PER_5MIN = '3';
  // Limits are read when the app is built, so build a fresh one.
  delete require.cache[require.resolve('../middleware/platform')];
  delete require.cache[require.resolve('../app')];
  const { createApp } = require('../app');
  const server = await new Promise((r) => { const s = createApp().listen(0, '127.0.0.1', () => r(s)); });
  const call = h.api(`http://127.0.0.1:${server.address().port}`);
  try {
    const body = { responses: { 1: 'brave' } };
    for (let i = 0; i < 3; i++) assert.equal((await call('POST', '/api/evaluate/wat', { token: h.tokenFor('clerk-alice'), body })).status, 200);
    const limited = await call('POST', '/api/evaluate/wat', { token: h.tokenFor('clerk-alice'), body });
    assert.equal(limited.status, 429);
    assert.ok(limited.headers.get('retry-after'));
    assert.equal((await call('POST', '/api/evaluate/wat', { token: h.tokenFor('clerk-bob'), body })).status, 200);
  } finally {
    delete process.env.RATE_LIMIT_AI_PER_5MIN;
    await new Promise((r) => server.close(r));
  }
});

test('per-IP limit applies before authentication', async () => {
  process.env.RATE_LIMIT_IP_PER_MIN = '4';
  delete require.cache[require.resolve('../middleware/platform')];
  delete require.cache[require.resolve('../app')];
  const { createApp } = require('../app');
  const server = await new Promise((r) => { const s = createApp().listen(0, '127.0.0.1', () => r(s)); });
  const call = h.api(`http://127.0.0.1:${server.address().port}`);
  try {
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await call('GET', '/api/images')).status);
    assert.deepEqual(statuses, [401, 401, 401, 401, 429, 429]);
  } finally {
    delete process.env.RATE_LIMIT_IP_PER_MIN;
    await new Promise((r) => server.close(r));
  }
});
