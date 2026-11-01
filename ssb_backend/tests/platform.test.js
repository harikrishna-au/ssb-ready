const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { makeApp, api, tokenFor } = require('./helpers');
const { scrub, scrubString } = require('../utils/logger');
const { runHealthChecks } = require('../services/healthChecks');

let app, call;
before(async () => { app = await makeApp(); call = api(app.url); });
after(() => app.close());

test('security headers are set and x-powered-by is removed', async () => {
  const r = await call('GET', '/api/health');
  assert.equal(r.headers.get('x-powered-by'), null);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(r.headers.get('content-security-policy'));
  assert.equal(r.headers.get('x-frame-options'), 'SAMEORIGIN');
});

test('CORS: allowed origin is echoed, unknown origin gets no CORS headers', async () => {
  const ok = await call('GET', '/api/health', { headers: { Origin: 'https://app.example.test' } });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'https://app.example.test');
  const bad = await call('GET', '/api/health', { headers: { Origin: 'https://evil.test' } });
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
});

test('CORS preflight from an unknown origin is not approved', async () => {
  const r = await call('OPTIONS', '/api/data/piq', { headers: { Origin: 'https://evil.test', 'Access-Control-Request-Method': 'POST' } });
  assert.equal(r.headers.get('access-control-allow-origin'), null);
});

test('a client-supplied x-request-id is kept only if it looks safe', async () => {
  const good = await call('GET', '/api/health', { headers: { 'x-request-id': 'abc-12345678' } });
  assert.equal(good.headers.get('x-request-id'), 'abc-12345678');
  const bad = await call('GET', '/api/health', { headers: { 'x-request-id': 'x\ty z<script>' } });
  assert.notEqual(bad.headers.get('x-request-id'), 'x\ty z<script>');
});

test('unknown routes return a JSON 404 with no stack', async () => {
  const r = await call('GET', '/api/nope', { token: tokenFor('clerk-alice') });
  assert.equal(r.status, 404);
  assert.equal(r.json.success, false);
});

test('GET /api/health is cheap liveness', async () => {
  const r = await call('GET', '/api/health');
  assert.deepEqual(r.json, { success: true, status: 'ok' });
});

test('health checks report only ok/fail per dependency and never error text', async () => {
  const probes = {
    database: async () => { throw new Error('secret-project-id-123 permission denied'); },
    supabase: async () => {},
    openai: () => new Promise(() => {}) // hangs: must time out
  };
  process.env.HEALTH_CHECK_TIMEOUT_MS = '50';
  delete require.cache[require.resolve('../services/healthChecks')];
  const { runHealthChecks: fresh } = require('../services/healthChecks');
  const r = await fresh({ probes, useCache: false });
  assert.deepEqual(r, { ok: false, checks: { database: 'fail', supabase: 'ok', openai: 'fail' } });
  assert.ok(!JSON.stringify(r).includes('secret'));
  delete process.env.HEALTH_CHECK_TIMEOUT_MS;
  const all = await runHealthChecks({ probes: { a: async () => {} }, useCache: false });
  assert.equal(all.ok, true);
});

test('logger scrubs stories, PIQ, tokens, e-mail and long strings', () => {
  const out = scrub({
    requestId: 'r1', status: 200,
    userStory: 'my private story', piq: { fullName: 'A' }, authorization: 'Bearer abc.def.ghi',
    note: 'x', nested: { email: 'a@b.co', ok: 'fine' },
    err: new Error('failed for a@b.com with Bearer abcdefghijkl and sk-abcdefghijklmnopqrstuv')
  });
  assert.equal(out.requestId, 'r1');
  assert.equal(out.status, 200);
  assert.equal(out.userStory, '[redacted]');
  assert.equal(out.piq, '[redacted]');
  assert.equal(out.authorization, '[redacted]');
  assert.equal(out.nested.email, '[redacted]');
  assert.equal(out.nested.ok, 'fine');
  assert.ok(!/a@b\.com|abcdefghijkl|sk-abc/.test(JSON.stringify(out.err)));
  assert.equal(scrubString('x'.repeat(1000)).length, 300);
});
