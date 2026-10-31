const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { memoryStore } = require('../services/radarStore');
const { createRadarService } = require('../services/radarService');
const w = require('../services/watcher');

const draft = { title: 'AFCAT 1 2027', conductedBy: 'Indian Air Force', service: 'Air Force', exam: 'AFCAT' };

test('cannot publish without source link and verified date; history records each step', async () => {
  const store = memoryStore();
  const svc = createRadarService({ store });
  const n = await svc.create(draft, 'admin');
  assert.equal(n.status, 'draft');
  await assert.rejects(svc.publish(n.id, 'admin'), (e) => e.statusCode === 422 && e.problems.length === 3);
  await svc.update(n.id, { sourceUrl: 'https://afcat.cdac.in', officialApplyUrl: 'https://afcat.cdac.in', verifiedOn: '2026-11-01' }, 'admin');
  const p = await svc.publish(n.id, 'admin');
  assert.equal(p.status, 'published');
  assert.equal(p.verifiedBy, 'admin');
  assert.equal((await svc.listPublic()).length, 1);
  assert.equal((await svc.listPublic())[0].verifiedBy, undefined);
  const h = await store.listHistory(n.id);
  assert.deepEqual(h.map((x) => x.action), ['published', 'updated', 'created']);
  // a live row cannot lose its source
  await assert.rejects(svc.update(n.id, { sourceUrl: '' }, 'admin'), (e) => e.statusCode === 422);
  await svc.archive(n.id, 'admin');
  assert.equal((await svc.listPublic()).length, 0);
});

test('create rejects duplicates and bad input', async () => {
  const svc = createRadarService({ store: memoryStore() });
  await svc.create(draft, 'a');
  await assert.rejects(svc.create(draft, 'a'), (e) => e.statusCode === 409);
  await assert.rejects(svc.create({ ...draft, title: 'Other', service: 'Space Force' }, 'a'), (e) => e.statusCode === 400);
  await assert.rejects(svc.create({ ...draft, title: 'Other', lastDate: '31-12-2026' }, 'a'), (e) => e.statusCode === 400);
});

test('tracker: stages, note limit, only published entries, remove', async () => {
  const store = memoryStore();
  const svc = createRadarService({ store });
  const n = await svc.create(draft, 'a');
  await assert.rejects(svc.setTracked('u1', n.id, {}), (e) => e.statusCode === 404); // still a draft
  await svc.update(n.id, { sourceUrl: 'https://x.gov.in', officialApplyUrl: 'https://x.gov.in', verifiedOn: '2026-11-01' }, 'a');
  await svc.publish(n.id, 'a');
  assert.equal((await svc.setTracked('u1', n.id, {})).status, 'saved');
  assert.equal((await svc.setTracked('u1', n.id, { status: 'applied' })).status, 'applied');
  assert.equal((await svc.setTracked('u1', n.id, { note: 'roll 123' })).status, 'applied'); // note keeps status
  await assert.rejects(svc.setTracked('u1', n.id, { status: 'nope' }), (e) => e.statusCode === 400);
  await assert.rejects(svc.setTracked('u1', n.id, { note: 'x'.repeat(161) }), (e) => e.statusCode === 400);
  assert.equal((await svc.getTracker('u2')).apps[n.id], undefined); // users are isolated
  await svc.archive(n.id, 'a');
  assert.equal((await svc.setTracked('u1', n.id, { status: 'result' })).status, 'result'); // existing records stay editable
  await svc.removeTracked('u1', n.id);
  assert.deepEqual((await svc.getTracker('u1')).apps, {});
});

test('legacy Clerk tracker import runs once and does not clobber server data', async () => {
  const store = memoryStore();
  const svc = createRadarService({ store });
  const legacy = { 'nda-1-2027': { status: 'applied', note: 'n', updatedAt: '2026-10-01T00:00:00.000Z' }, 'cds-1-2027': { status: 'saved', updatedAt: '2026-10-02T00:00:00.000Z' } };
  assert.equal((await svc.getTracker('u1')).migrated, false);
  const r = await svc.importLegacy('u1', legacy);
  assert.equal(r.imported, 2);
  const t = await svc.getTracker('u1');
  assert.equal(t.migrated, true);
  assert.equal(t.apps['nda-1-2027'].status, 'applied');
  assert.equal(t.apps['nda-1-2027'].updatedAt, '2026-10-01T00:00:00.000Z');
  // second call, even with different data, is a no-op
  assert.deepEqual(await svc.importLegacy('u1', { z: { status: 'saved' } }), { imported: 0, already: true });
  assert.equal(Object.keys((await svc.getTracker('u1')).apps).length, 2);
});

// ---- watcher --------------------------------------------------------------
const fx = (f) => fs.readFileSync(path.join(__dirname, 'fixtures/radar', f), 'utf8');

test('extractText ignores scripts, styles and comments', () => {
  const t = w.extractText(fx('navy-before.html'));
  assert.ok(!/Date\.now|build 1|\.x\{/.test(t));
  assert.match(t, /extended upto 03 Aug 26/);
});

test('watcher: baseline, unchanged, then a change opens one review item with the diff', async () => {
  const store = memoryStore();
  await store.saveSource({ url: 'https://example.gov.in/', label: 'Test page', enabled: true });
  let body = fx('navy-before.html');
  const seen = [];
  const fetchImpl = async (url) => { seen.push(url); return url.endsWith('robots.txt') ? { ok: true, text: 'User-agent: *\nDisallow: /private' } : { ok: true, status: 200, text: body }; };
  const run = () => w.runWatcher({ store, nowIso: '2026-11-01T00:00:00Z', fetchImpl, sleep: async () => {} });
  assert.equal((await run())[0].outcome, 'baseline');
  assert.equal((await run())[0].outcome, 'unchanged');
  assert.equal((await store.listReviews()).length, 0);
  body = fx('navy-after.html');
  const r = (await run())[0];
  assert.equal(r.outcome, 'changed');
  const reviews = await store.listReviews();
  assert.equal(reviews.length, 1);
  assert.ok(reviews[0].diff.added.some((l) => /Jan 28 Course is live/.test(l)));
  assert.ok(reviews[0].diff.removed.some((l) => /28\/09\/2026/.test(l)));
  assert.equal((await run())[0].outcome, 'unchanged'); // same content again: no second item
  assert.equal((await store.listReviews()).length, 1);
  assert.equal(seen.filter((u) => u.endsWith('robots.txt')).length, 4);
});

test('watcher honours robots.txt and records fetch errors without throwing', async () => {
  const store = memoryStore();
  await store.saveSource({ url: 'https://a.gov.in/private/page', label: 'A', enabled: true });
  await store.saveSource({ url: 'https://b.gov.in/', label: 'B', enabled: true });
  const fetchImpl = async (url) => {
    if (url.startsWith('https://a.gov.in/robots')) return { ok: true, text: 'User-agent: *\nDisallow: /private' };
    if (url.startsWith('https://b.gov.in/robots')) return { ok: false, status: 404, text: '' };
    if (url.startsWith('https://b.gov.in')) return { ok: false, status: 503, text: '' };
    throw new Error('should not fetch blocked page');
  };
  const sleeps = [];
  const out = await w.runWatcher({ store, nowIso: 'now', fetchImpl, sleep: async (ms) => sleeps.push(ms), delayMs: 1500 });
  assert.deepEqual(out.map((o) => o.outcome), ['robots-blocked', 'error']);
  assert.ok(sleeps.length >= 2 && sleeps.every((s) => s === 1500)); // rate limiting between requests
  assert.equal((await store.listSources()).find((s) => s.url.includes('b.gov')).lastError, 'HTTP 503');
});

test('robotsAllows: longest match wins, specific agent group preferred', () => {
  const txt = 'User-agent: *\nDisallow: /a\nAllow: /a/ok\n\nUser-agent: ReadyKadetRadarWatcher\nDisallow: /only-us';
  assert.equal(w.robotsAllows(txt, '/a/x'), true); // our own group applies, '*' does not
  assert.equal(w.robotsAllows(txt, '/only-us/x'), false);
  assert.equal(w.robotsAllows('User-agent: *\nDisallow: /a\nAllow: /a/ok', '/a/ok/y'), true);
  assert.equal(w.robotsAllows('User-agent: *\nDisallow: /a\nAllow: /a/ok', '/a/no'), false);
  assert.equal(w.robotsAllows('', '/x'), true);
  assert.match(w.UA(), /ReadyKadetRadarWatcher/);
});
