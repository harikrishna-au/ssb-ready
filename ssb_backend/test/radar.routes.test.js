const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { memoryStore } = require('../services/radarStore');
const { createRadarRouter } = require('../routes/radarRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');

async function boot() {
  const store = memoryStore();
  const mailer = { sent: [], live: false, async send(m) { this.sent.push(m); return { dryRun: true }; } };
  process.env.CRON_SECRET = 'test-secret';
  // Test auth: "Bearer user:<uid>" -> that uid. No real tokens involved.
  const auth = (req, _res, next) => {
    const m = /^Bearer user:(\w+)$/.exec(req.headers.authorization || '');
    if (!m) return next(Object.assign(new Error('no token'), { statusCode: 401 }));
    const uid = m[1];
    req.authUser = { uid, email: `${uid}@example.com` };
    next();
  };
  const clerkVerified = new Set(['u1', 'cl_verified']);
  const app = express();
  app.use(express.json());
  app.use('/api/radar', createRadarRouter({ getStore: () => store, auth, isAdmin: async (u) => u === 'admin', mailer, nowMs: () => Date.UTC(2026, 11, 15, 4, 0), emailOf: async (u) => (clerkVerified.has(u) ? `${u}@example.com` : '') }));
  app.use(errorHandler);
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api/radar`;
  const call = async (method, p, who, body, headers = {}) => {
    const res = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer user:${who}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = null; }
    return { status: res.status, json, text, headers: res.headers };
  };
  return { call, store, mailer, close: () => server.close() };
}

test('end to end over HTTP: admin workflow, public read, tracker, reminders, unsubscribe', async (t) => {
  const { call, mailer, close } = await boot();
  t.after(close);

  assert.equal((await call('GET', '/admin/items')).status, 401);
  assert.equal((await call('GET', '/admin/items', 'student')).status, 403);

  const c = await call('POST', '/admin/items', 'admin', { title: 'NDA I 2027', conductedBy: 'UPSC', service: 'Tri-service', exam: 'NDA', opens: '2026-12-02', lastDate: '2026-12-22', confidence: 'tentative' });
  assert.equal(c.status, 201);
  const id = c.json.item.id;
  assert.equal((await call('GET', '/')).json.items.length, 0); // drafts are not public
  const bad = await call('POST', `/admin/items/${id}/publish`, 'admin');
  assert.equal(bad.status, 422);
  assert.match(bad.json.error.message, /Cannot publish/);
  await call('PATCH', `/admin/items/${id}`, 'admin', { sourceUrl: 'https://upsc.gov.in', officialApplyUrl: 'https://upsconline.nic.in', verifiedOn: '2026-12-01' });
  assert.equal((await call('POST', `/admin/items/${id}/publish`, 'admin')).status, 200);

  const pub = await call('GET', '/');
  assert.equal(pub.json.items.length, 1);
  assert.equal(pub.json.items[0].verifiedBy, undefined);
  assert.equal(pub.json.items[0].sourceUrl, 'https://upsc.gov.in');

  assert.equal((await call('GET', '/tracker')).status, 401);
  assert.equal((await call('PUT', `/tracker/${id}`, 'u1', {})).status, 200);
  assert.equal((await call('GET', '/tracker', 'u1')).json.apps[id].status, 'saved');
  assert.deepEqual((await call('GET', '/tracker', 'u2')).json.apps, {});
  const imp = await call('POST', '/tracker/import', 'u2', { apps: { [id]: { status: 'applied', updatedAt: '2026-10-01T00:00:00Z' } } });
  assert.equal(imp.json.imported, 1);

  // prefs take the email from the verified account, not the body; reminders need the emailed confirmation
  const pr = await call('PUT', '/prefs', 'u1', { remindersEnabled: true, email: 'attacker@example.com' });
  assert.equal(pr.json.prefs.hasEmail, true);
  assert.equal(pr.json.prefs.confirmed, false);
  assert.equal(pr.json.confirmationSent, true);
  assert.equal(mailer.sent.length, 1);
  assert.equal(mailer.sent[0].to, 'u1@example.com');
  assert.match(mailer.sent[0].subject, /Confirm/);
  assert.equal((await call('POST', '/cron/reminders', null, null, { 'x-cron-secret': 'test-secret' })).json.considered, 0); // not confirmed yet
  const ctok = /token=([^\s&]+)/.exec(mailer.sent[0].text)[1];
  assert.equal((await call('GET', `/confirm?token=${ctok}`)).status, 200);
  assert.equal((await call('GET', '/prefs', 'u1')).json.prefs.confirmed, false); // GET alone does not confirm
  assert.equal((await call('POST', '/confirm?token=wrong')).status, 404);
  assert.equal((await call('POST', `/confirm?token=${ctok}`)).status, 200);
  assert.equal((await call('GET', '/prefs', 'u1')).json.prefs.confirmed, true);
  assert.equal((await call('POST', `/confirm?token=${ctok}`)).status, 404); // single use
  mailer.sent.length = 0;

  assert.equal((await call('POST', '/cron/reminders')).status, 401);
  assert.equal((await call('POST', '/cron/reminders', null, null, { 'x-cron-secret': 'nope' })).status, 401);
  const run1 = await call('POST', '/cron/reminders', null, null, { Authorization: 'Bearer test-secret' });
  assert.equal(run1.json.dry_run, 1);
  const run2 = await call('POST', '/cron/reminders', null, null, { 'x-cron-secret': 'test-secret' });
  assert.equal(run2.json.duplicate, 1);
  assert.equal(mailer.sent.length, 1);
  assert.equal(mailer.sent[0].to, 'u1@example.com');
  assert.match(mailer.sent[0].subject, /last date/);

  const tok = /token=([^\s&]+)/.exec(mailer.sent[0].unsubscribeUrl)[1];
  assert.equal((await call('GET', `/unsubscribe?token=${tok}`)).status, 200);
  assert.equal((await call('GET', '/unsubscribe?token=bad')).status, 404);
  assert.equal((await call('GET', '/prefs', 'u1')).json.prefs.remindersEnabled, false);

  assert.match((await call('GET', '/feed.xml')).text, /<item><title>NDA I 2027/);
  assert.equal((await call('GET', '/feed.json')).json.items.length, 1);
  const ics = await call('GET', '/calendar.ics');
  assert.match(ics.headers.get('content-type'), /text\/calendar/);
  assert.match(ics.text, /BEGIN:VEVENT/);

  await call('POST', `/admin/items/${id}/archive`, 'admin');
  assert.equal((await call('GET', '/')).json.items.length, 0);
  const item = await call('GET', `/admin/items/${id}`, 'admin');
  assert.ok(item.json.history.length >= 4);
});

test('cron endpoints are closed when CRON_SECRET is unset', async (t) => {
  const { call, close } = await boot();
  t.after(close);
  delete process.env.CRON_SECRET;
  assert.equal((await call('POST', '/cron/watch', null, null, { 'x-cron-secret': '' })).status, 401);
});

test('reminder email addresses: only verified ones are accepted', async (t) => {
  const { call, store, mailer, close } = await boot();
  t.after(close);
  const on = { remindersEnabled: true };

  // Clerk, primary not verified
  r = await call('PUT', '/prefs', 'cl_unverified', { ...on, email: 'victim@example.com' });
  assert.equal(r.status, 422);
  assert.equal((await store.getPrefs('cl_unverified')).email || '', '');
  // Clerk, verified primary
  r = await call('PUT', '/prefs', 'cl_verified', on);
  assert.equal(r.status, 200);
  assert.equal(r.json.confirmationSent, true);
  // no email at all (token without email, nothing from Clerk)
  r = await call('PUT', '/prefs', 'nobody', on);
  assert.equal(r.status, 422);
  assert.match(r.json.error.message, /Verify your email/);
  // only verified users were mailed, and only a confirmation (never a reminder)
  assert.deepEqual(mailer.sent.map((m) => m.to).sort(), ['cl_verified@example.com']);
  assert.ok(mailer.sent.every((m) => /Confirm/.test(m.subject)));
  // turning reminders off never needs an address
  r = await call('PUT', '/prefs', 'nobody', { remindersEnabled: false });
  assert.equal(r.status, 200);
});
