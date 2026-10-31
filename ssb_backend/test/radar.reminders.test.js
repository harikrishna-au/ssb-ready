const test = require('node:test');
const assert = require('node:assert/strict');
const { memoryStore } = require('../services/radarStore');
const { createRadarService } = require('../services/radarService');
const rem = require('../services/reminders');

const NOW = Date.UTC(2026, 11, 15, 4, 0); // 15 Dec 2026, 09:30 IST => 7 days before 22 Dec
const published = { id: 'nda-1-2027', title: 'NDA I 2027', body: '', conductedBy: 'UPSC', service: 'Tri-service', exam: 'NDA', opens: '2026-12-02', lastDate: '2026-12-22', confidence: 'tentative', sourceUrl: 'https://upsc.gov.in', officialApplyUrl: 'https://upsconline.nic.in', applyLabel: 'x', status: 'published', verifiedOn: '2026-12-01', version: 1, createdAt: 'a', updatedAt: 'a' };

function countingMailer() {
  const sent = [];
  return { sent, live: false, async send(m) { sent.push(m); return { dryRun: true }; } };
}
async function world() {
  const store = memoryStore();
  await store.saveNotification(published);
  await store.savePrefs({ userId: 'u1', email: 'u1@example.com', emailConfirmedFor: 'u1@example.com' });
  await store.upsertTracked({ userId: 'u1', notificationId: 'nda-1-2027', status: 'saved', updatedAt: 'x' });
  return { store, mailer: countingMailer() };
}

test('sends a 7-day reminder once; running the job again sends nothing', async () => {
  const { store, mailer } = await world();
  const a = await rem.runDailyReminders({ store, mailer, nowMs: NOW });
  assert.equal(a.dry_run, 1);
  const b = await rem.runDailyReminders({ store, mailer, nowMs: NOW });
  const c = await rem.runDailyReminders({ store, mailer, nowMs: NOW + 3_600_000 }); // same IST day, later
  assert.equal(b.duplicate, 1); assert.equal(b.dry_run, 0);
  assert.equal(c.duplicate, 1);
  assert.equal(mailer.sent.length, 1);
  assert.match(mailer.sent[0].subject, /in 7 days/);
  assert.match(mailer.sent[0].text, /Stop these emails/);
  assert.match(mailer.sent[0].unsubscribeUrl, /unsubscribe\?token=/);
});

test('concurrent runs still send one email', async () => {
  const { store, mailer } = await world();
  await Promise.all([1, 2, 3].map(() => rem.runDailyReminders({ store, mailer, nowMs: NOW })));
  assert.equal(mailer.sent.length, 1);
});

test('3 and 1 day windows fire on their days, nothing in between', async () => {
  const { store, mailer } = await world();
  const day = (d) => Date.UTC(2026, 11, d, 4, 0);
  for (const d of [16, 17, 18, 19, 20, 21, 22]) await rem.runDailyReminders({ store, mailer, nowMs: day(d) });
  assert.deepEqual(mailer.sent.map((m) => /in 3 days|tomorrow/.exec(m.subject)[0]), ['in 3 days', 'tomorrow']);
});

test('no reminder once the user has applied, unsubscribed, or has no email', async () => {
  let { store, mailer } = await world();
  await store.upsertTracked({ userId: 'u1', notificationId: 'nda-1-2027', status: 'applied', updatedAt: 'y' });
  await rem.runDailyReminders({ store, mailer, nowMs: NOW });
  assert.equal(mailer.sent.length, 0);

  ({ store, mailer } = await world());
  const p = await store.getPrefs('u1');
  const svc = createRadarService({ store });
  assert.equal(await svc.unsubscribe(p.unsubscribeToken), true);
  await rem.runDailyReminders({ store, mailer, nowMs: NOW });
  assert.equal(mailer.sent.length, 0);
  assert.equal(await svc.unsubscribe('wrong'), false);

  ({ store, mailer } = await world());
  await store.savePrefs({ userId: 'u1', email: '' });
  const r = await rem.runDailyReminders({ store, mailer, nowMs: NOW });
  assert.equal(r.considered, 0);
  assert.equal(mailer.sent.length, 0);

  // address stored but never confirmed (double opt-in): nothing is sent
  ({ store, mailer } = await world());
  await store.savePrefs({ userId: 'u1', emailConfirmedFor: '' });
  await rem.runDailyReminders({ store, mailer, nowMs: NOW });
  assert.equal(mailer.sent.length, 0);
  // the confirmed address changes: needs a fresh confirmation
  await store.savePrefs({ userId: 'u1', emailConfirmedFor: 'u1@example.com', email: 'new@example.com' });
  await rem.runDailyReminders({ store, mailer, nowMs: NOW });
  assert.equal(mailer.sent.length, 0);
});

test('digest users get one combined email per day', async () => {
  const { store, mailer } = await world();
  await store.saveNotification({ ...published, id: 'cds-1-2027', title: 'CDS I 2027' });
  await store.upsertTracked({ userId: 'u1', notificationId: 'cds-1-2027', status: 'saved', updatedAt: 'x' });
  await store.savePrefs({ userId: 'u1', digest: true });
  await rem.runDailyReminders({ store, mailer, nowMs: NOW });
  await rem.runDailyReminders({ store, mailer, nowMs: NOW });
  assert.equal(mailer.sent.length, 1);
  assert.match(mailer.sent[0].text, /NDA I 2027/);
  assert.match(mailer.sent[0].text, /CDS I 2027/);
});

test('unpublished or archived entries never trigger reminders', async () => {
  const { store, mailer } = await world();
  await store.saveNotification({ ...published, status: 'archived' });
  await rem.runDailyReminders({ store, mailer, nowMs: NOW });
  assert.equal(mailer.sent.length, 0);
});

test('a moved last date produces a fresh reminder and one change notice', async () => {
  const { store, mailer } = await world();
  const svc = createRadarService({ store, now: () => '2026-12-10T00:00:00Z', onChange: (n, ch) => rem.notifyChange({ store, mailer, nowMs: NOW }, n, ch) });
  await rem.runDailyReminders({ store, mailer, nowMs: NOW });
  await svc.update('nda-1-2027', { lastDate: '2026-12-29' }, 'admin');
  assert.equal(mailer.sent.filter((m) => /^Update:/.test(m.subject)).length, 1);
  assert.match(mailer.sent.at(-1).text, /2026-12-22 -> 2026-12-29/);
  await rem.runDailyReminders({ store, mailer, nowMs: Date.UTC(2026, 11, 22, 4, 0) }); // 7 days before the new date
  assert.equal(mailer.sent.length, 3);
  // typo fix: no email
  await svc.update('nda-1-2027', { body: 'typo fixed' }, 'admin');
  assert.equal(mailer.sent.length, 3);
});

test('a failed send is recorded and not retried into a duplicate', async () => {
  const { store } = await world();
  const bad = { live: true, async send() { throw new Error('provider down'); } };
  const r = await rem.runDailyReminders({ store, mailer: bad, nowMs: NOW });
  assert.equal(r.failed, 1);
  assert.equal((await store.listOutbox())[0].status, 'failed');
  const again = await rem.runDailyReminders({ store, mailer: bad, nowMs: NOW });
  assert.equal(again.duplicate, 1);
});

test('mailer is dry-run unless explicitly live, and never calls the network then', async () => {
  let called = false;
  const f = async () => { called = true; return { ok: true }; };
  assert.equal((await rem.createMailer({}, f).send({ to: 'a@b.c', subject: 's', text: 't' })).dryRun, true);
  assert.equal((await rem.createMailer({ RESEND_API_KEY: 'k' }, f).send({})).dryRun, true);
  assert.equal(called, false);
  const live = rem.createMailer({ RADAR_EMAIL_MODE: 'live', RESEND_API_KEY: 'k', RADAR_EMAIL_FROM: 'a@b.c' }, f);
  assert.equal((await live.send({ to: 'x@y.z', subject: 's', text: 't', unsubscribeUrl: 'u' })).dryRun, false);
  assert.equal(called, true);
});
