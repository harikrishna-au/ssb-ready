const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
const { createApp } = require('../app');

let app, call;
before(async () => { app = await h.makeApp(); call = h.api(app.url); });
after(() => app.close());

// Walk Express's router stack and list every route mounted under /api with whether it carries the guard.
function listRoutes(stack, prefix = '') {
  const out = [];
  for (const layer of stack) {
    if (layer.route) {
      const guarded = layer.route.stack.some((l) => l.handle.isGuard);
      for (const method of Object.keys(layer.route.methods)) out.push({ method: method.toUpperCase(), path: prefix + layer.route.path, guarded });
    } else if (layer.handle?.stack) {
      const mount = (layer.regexp.source.match(/^\^\\\/([\w\\/-]+?)\\\/\?\(\?=/) || [, ''])[1].replace(/\\\//g, '/');
      out.push(...listRoutes(layer.handle.stack, `${prefix}/${mount}`));
    }
  }
  return out;
}

const PUBLIC = [/^\/api\/health/];

test('FAIL CLOSED: every route under /api is guarded unless explicitly public', () => {
  const routes = listRoutes(createApp()._router.stack).filter((r) => r.path.startsWith('/api'));
  assert.ok(routes.length > 20, `found only ${routes.length} routes; route walker is broken`);
  const unguarded = routes.filter((r) => !r.guarded && !PUBLIC.some((p) => p.test(r.path)));
  assert.deepEqual(unguarded, [], 'These /api routes have no guard() (auth, rate limit, validation)');
});

test('routing is case sensitive: wrong-case paths do not reach handlers', async () => {
  const t = h.tokenFor('clerk-alice');
  for (const p of ['/API/images', '/api/Images', '/Api/evaluate/wat', '/api/EVALUATE/wat']) {
    const r = await call('POST', p, { token: t, body: { responses: { 1: 'a' } } });
    assert.equal(r.status, 404, p);
  }
  assert.equal(h.state.ai.calls.length, 0);
});

test('trailing slash still hits the guarded route (validation and limits apply)', async () => {
  const t = h.tokenFor('clerk-alice');
  assert.equal((await call('POST', '/api/evaluate/wat/', { token: t, body: { responses: 'bad' } })).status, 400);
  assert.equal((await call('GET', '/api/images/')).status, 401);
});

test('double slash and encoded-slash variants never reach a handler unguarded', async () => {
  const t = h.tokenFor('clerk-alice');
  for (const p of ['//api/evaluate/wat', '/api//evaluate/wat', '/api%2fevaluate%2fwat', '/api/evaluate%2fwat']) {
    const r = await call('POST', p, { token: t, body: { responses: 'bad' } });
    assert.ok([400, 404].includes(r.status), `${p} -> ${r.status}`); // 400 = reached the guarded handler and was validated
    assert.equal(h.state.ai.calls.length, 0, p);
  }
});

test('HEAD and OPTIONS variants do not skip authentication', async () => {
  assert.equal((await call('HEAD', '/api/images')).status, 401);
  assert.equal((await call('HEAD', '/api/account/export')).status, 401);
  const opt = await call('OPTIONS', '/api/account', { headers: { Origin: 'https://evil.test', 'Access-Control-Request-Method': 'DELETE' } });
  assert.equal(opt.headers.get('access-control-allow-origin'), null);
});

test('rate limits cannot be dodged by changing the path spelling', async () => {
  process.env.RATE_LIMIT_ACCOUNT_PER_HOUR = '2';
  for (const m of ['../middleware/rateLimit', '../middleware/guard', '../middleware/platform', '../routes/accountRoutes', '../app']) delete require.cache[require.resolve(m)];
  const fresh = require('../app').createApp();
  const server = await new Promise((r) => { const s = fresh.listen(0, '127.0.0.1', () => r(s)); });
  const c = h.api(`http://127.0.0.1:${server.address().port}`);
  try {
    const t = h.tokenFor('clerk-bob');
    const codes = [];
    for (const p of ['/api/account/export', '/api/account/export/', '/api/account/export', '/api/account/export/']) codes.push((await c('GET', p, { token: t })).status);
    assert.deepEqual(codes.slice(0, 2), [200, 200]);
    assert.deepEqual(codes.slice(2), [429, 429]);
  } finally {
    delete process.env.RATE_LIMIT_ACCOUNT_PER_HOUR;
    await new Promise((r) => server.close(r));
  }
});
