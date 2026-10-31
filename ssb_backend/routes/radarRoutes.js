'use strict';
const express = require('express');
const { guard } = require('../middleware/guard');
const crypto = require('crypto');
const core = require('../services/radarCore');
const { asyncHandler } = require('../middleware/asyncHandler');
const { createRadarService, httpError } = require('../services/radarService');
const reminders = require('../services/reminders');
const watcher = require('../services/watcher');
const SOURCES = require('../services/radarSources');

const SITE = () => (process.env.RADAR_SITE_URL || 'https://readykadet.com').replace(/\/$/, '');
const csv = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);
const safeEq = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

/** Default auth: Clerk/Firebase token via the shared middleware, loaded lazily so tests need no Firebase. */
const defaultAuth = (req, res, next) => require('../middleware/firebaseAuthMiddleware').firebaseProtect(req, res, next);

/** Admin = uid in RADAR_ADMIN_USER_IDS, or Clerk publicMetadata.role === 'admin'. */
async function defaultIsAdmin(uid) {
  if (csv(process.env.RADAR_ADMIN_USER_IDS).includes(uid)) return true;
  if (!process.env.CLERK_SECRET_KEY) return false;
  try {
    const { createClerkClient } = require('@clerk/backend');
    const u = await createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY }).users.getUser(uid);
    return u.publicMetadata?.role === 'admin';
  } catch { return false; }
}
/** Clerk: the PRIMARY address, and only if Clerk has verified it. Otherwise ''. */
async function defaultEmailOf(uid) {
  if (!process.env.CLERK_SECRET_KEY) return '';
  try {
    const { createClerkClient } = require('@clerk/backend');
    const u = await createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY }).users.getUser(uid);
    const primary = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId);
    return primary && primary.verification?.status === 'verified' ? primary.emailAddress : '';
  } catch { return ''; }
}

function createRadarRouter(deps = {}) {
  const getStore = deps.getStore || (() => require('../services/radarStore').getStore());
  const authMw = deps.auth || defaultAuth;
  // Real server: the shared per-route guard (auth + rate limit). Tests may inject their own login,
  // which still has to carry the marker the fail-closed test looks for.
  const gated = (limits = ['write']) => (deps.auth ? [deps.auth, Object.assign((_q, _r, n) => n(), { isGuard: true })] : guard({ limits }));
  const isAdmin = deps.isAdmin || defaultIsAdmin;
  const emailOf = deps.emailOf || defaultEmailOf;
  const nowMs = deps.nowMs || (() => Date.now());
  const mailer = deps.mailer || reminders.createMailer();
  const fetchImpl = deps.fetchImpl;
  const router = express.Router();

  const svc = () => {
    const store = getStore();
    return createRadarService({
      store, now: () => new Date(nowMs()).toISOString(),
      onChange: async (n, changes) => { await reminders.notifyChange({ store, mailer, nowMs: nowMs() }, n, changes); },
    });
  };
  const adminOnly = [...gated(['write']), asyncHandler(async (req, _res, next) => {
    if (!(await isAdmin(req.firebaseUser.uid))) throw httpError(403, 'Admins only.');
    next();
  })];
  const cronOnly = (req, _res, next) => {
    const secret = process.env.CRON_SECRET;
    const given = req.headers['x-cron-secret'] || (req.headers.authorization || '').replace(/^Bearer /, '');
    if (!secret || !given || !safeEq(secret, given)) return next(httpError(401, 'Bad cron secret.'));
    next();
  };

  // ---- public ----------------------------------------------------------
  router.get('/', asyncHandler(async (_req, res) => {
    const items = await svc().listPublic();
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ success: true, items, generatedAt: new Date(nowMs()).toISOString() });
  }));

  router.get('/feed.json', asyncHandler(async (_req, res) => {
    const items = await svc().listPublic();
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      version: 'https://jsonfeed.org/version/1.1', title: 'ReadyKadet Radar', home_page_url: `${SITE()}/radar`,
      items: items.map((n) => ({ id: `${n.id}-v${n.version}`, url: `${SITE()}/radar#${n.id}`, title: n.title, content_text: n.body, date_modified: n.updatedAt, _radar: n })),
    });
  }));
  router.get('/feed.xml', asyncHandler(async (_req, res) => {
    const items = (await svc().listPublic()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.type('application/rss+xml').set('Cache-Control', 'public, max-age=300')
      .send(core.toRss(items, { siteUrl: SITE(), title: 'ReadyKadet Radar', buildDate: new Date(nowMs()).toISOString() }));
  }));
  router.get('/calendar.ics', asyncHandler(async (_req, res) => {
    const items = await svc().listPublic();
    res.type('text/calendar').set('Content-Disposition', 'attachment; filename="radar.ics"').send(core.toIcs(items, new Date(nowMs()).toISOString()));
  }));

  router.get('/:id/calendar.ics', asyncHandler(async (req, res) => {
    const n = (await svc().listPublic()).find((x) => x.id === req.params.id);
    if (!n) throw httpError(404, 'Not found.');
    res.type('text/calendar').set('Content-Disposition', `attachment; filename="${n.id}.ics"`).send(core.toIcs([n], new Date(nowMs()).toISOString()));
  }));

  router.get('/unsubscribe', asyncHandler(async (req, res) => {
    const ok = await svc().unsubscribe(String(req.query.token || ''));
    res.status(ok ? 200 : 404).type('html').send(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Radar reminders</title><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>${ok ? 'You are unsubscribed' : 'Link not recognised'}</h1><p>${ok ? 'We will not send you Radar reminder emails. You can turn them back on from My applications.' : 'This unsubscribe link is invalid or was already replaced.'}</p></body>`,
    );
  }));
  router.post('/unsubscribe', asyncHandler(async (req, res) => { // RFC 8058 one-click
    const ok = await svc().unsubscribe(String(req.query.token || ''));
    res.status(ok ? 200 : 404).json({ success: ok });
  }));

  // ---- signed-in user: tracker + prefs ----------------------------------
  router.get('/tracker', ...gated(), asyncHandler(async (req, res) => {
    res.json({ success: true, ...(await svc().getTracker(req.firebaseUser.uid)) });
  }));
  router.put('/tracker/:id', ...gated(), asyncHandler(async (req, res) => {
    const { status, note } = req.body || {};
    res.json({ success: true, entry: await svc().setTracked(req.firebaseUser.uid, req.params.id, { status, note }) });
  }));
  router.delete('/tracker/:id', ...gated(), asyncHandler(async (req, res) => {
    await svc().removeTracked(req.firebaseUser.uid, req.params.id);
    res.json({ success: true });
  }));
  router.post('/tracker/import', ...gated(), asyncHandler(async (req, res) => {
    res.json({ success: true, ...(await svc().importLegacy(req.firebaseUser.uid, req.body?.apps)) });
  }));

  const prefsOut = (p) => ({ remindersEnabled: p.remindersEnabled, digest: p.digest, hasEmail: !!p.email, confirmed: !!p.email && p.emailConfirmedFor === p.email, timezone: p.timezone });
  router.get('/prefs', ...gated(), asyncHandler(async (req, res) => {
    res.json({ success: true, prefs: prefsOut(await svc().getPrefs(req.firebaseUser.uid)) });
  }));

  /**
   * The address is never taken from the request body. It must come from a source that has verified it:
   * a Firebase token with email_verified === true, or a Clerk primary address with verification 'verified'.
   * A token's own email claim is ignored for Clerk users because it carries no verification flag.
   */
  async function verifiedEmail(req) {
    const u = req.firebaseUser;
    if (u.email_verified !== undefined) return u.email_verified === true && u.email ? u.email : '';
    return emailOf(u.uid);
  }
  router.put('/prefs', ...gated(), asyncHandler(async (req, res) => {
    const uid = req.firebaseUser.uid;
    const wantsMail = req.body?.remindersEnabled === true || req.body?.digest === true;
    const email = await verifiedEmail(req);
    if (wantsMail && !email) {
      // Nothing is stored and reminders stay off until a verified address exists.
      await svc().setPrefs(uid, { remindersEnabled: false, email: '' });
      return res.status(422).json({ success: false, needsVerifiedEmail: true, error: { message: 'Verify your email address in your account settings first. Reminders stay off until then.' } });
    }
    let p = await svc().setPrefs(uid, { remindersEnabled: req.body?.remindersEnabled, digest: req.body?.digest, email });
    let confirmationSent = false;
    if (email && p.emailConfirmedFor !== p.email && p.remindersEnabled !== false) {
      const r = await reminders.sendConfirmation({ store: getStore(), mailer, nowMs: nowMs() }, p);
      confirmationSent = r === 'sent' || r === 'dry_run';
    }
    p = await svc().getPrefs(uid);
    res.json({ success: true, prefs: prefsOut(p), confirmationSent });
  }));

  // Double opt-in. GET only shows a button (mail scanners that prefetch links must not confirm for the user).
  const page = (h, p) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Radar reminders</title><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>${h}</h1>${p}</body>`;
  router.get('/confirm', asyncHandler(async (req, res) => {
    const t = encodeURIComponent(String(req.query.token || ''));
    res.type('html').send(page('Confirm reminder emails', `<form method="post" action="?token=${t}"><button style="font-size:1rem;padding:.75rem 1.25rem">Yes, send me deadline reminders</button></form>`));
  }));
  router.post('/confirm', asyncHandler(async (req, res) => {
    const ok = await svc().confirmEmail(String(req.query.token || ''));
    res.status(ok ? 200 : 404).type('html').send(page(ok ? 'Reminders are on' : 'Link not recognised', ok ? '<p>You will get a reminder 7, 3 and 1 days before the last date of notifications you saved and have not marked as applied. Every email has a one-click unsubscribe link.</p>' : '<p>This confirmation link is invalid or has been replaced. Ask for a new one from My applications.</p>'));
  }));

  // ---- admin -------------------------------------------------------------
  router.get('/admin/me', ...adminOnly, (_req, res) => res.json({ success: true, admin: true }));
  router.get('/admin/items', ...adminOnly, asyncHandler(async (_req, res) => {
    const items = (await getStore().listNotifications()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.json({ success: true, items: items.map((n) => ({ ...n, problems: core.publishProblems(n) })) });
  }));
  router.get('/admin/items/:id', ...adminOnly, asyncHandler(async (req, res) => {
    const store = getStore();
    const item = await store.getNotification(req.params.id);
    if (!item) throw httpError(404, 'Not found.');
    res.json({ success: true, item, problems: core.publishProblems(item), history: await store.listHistory(item.id) });
  }));
  router.post('/admin/items', ...adminOnly, asyncHandler(async (req, res) => {
    res.status(201).json({ success: true, item: await svc().create(req.body || {}, req.firebaseUser.uid) });
  }));
  router.patch('/admin/items/:id', ...adminOnly, asyncHandler(async (req, res) => {
    res.json({ success: true, item: await svc().update(req.params.id, req.body || {}, req.firebaseUser.uid) });
  }));
  router.post('/admin/items/:id/publish', ...adminOnly, asyncHandler(async (req, res) => {
    res.json({ success: true, item: await svc().publish(req.params.id, req.firebaseUser.uid) });
  }));
  router.post('/admin/items/:id/archive', ...adminOnly, asyncHandler(async (req, res) => {
    res.json({ success: true, item: await svc().archive(req.params.id, req.firebaseUser.uid) });
  }));
  router.post('/admin/items/:id/verified', ...adminOnly, asyncHandler(async (req, res) => {
    res.json({ success: true, item: await svc().stampVerified(req.params.id, req.firebaseUser.uid, core.istToday(nowMs())) });
  }));
  router.get('/admin/reviews', ...adminOnly, asyncHandler(async (req, res) => {
    res.json({ success: true, reviews: await getStore().listReviews(req.query.status === 'done' ? 'done' : req.query.status === 'dismissed' ? 'dismissed' : 'open'), sources: await getStore().listSources().then((s) => s.map(({ contentText, ...r }) => r)) }); // eslint-disable-line no-unused-vars
  }));
  router.post('/admin/reviews/:id/resolve', ...adminOnly, asyncHandler(async (req, res) => {
    const status = req.body?.status === 'dismissed' ? 'dismissed' : 'done';
    const r = await getStore().resolveReview(req.params.id, status, req.firebaseUser.uid, new Date(nowMs()).toISOString());
    if (!r) throw httpError(404, 'Not found.');
    res.json({ success: true, review: r });
  }));
  router.get('/admin/outbox', ...adminOnly, asyncHandler(async (_req, res) => {
    res.json({ success: true, mode: mailer.live ? 'live' : 'dry-run', outbox: await getStore().listOutbox() });
  }));

  // ---- cron (secret-protected) ---------------------------------------------
  router.all('/cron/reminders', cronOnly, asyncHandler(async (_req, res) => {
    const out = await reminders.runDailyReminders({ store: getStore(), mailer, nowMs: nowMs() });
    res.json({ success: true, mode: mailer.live ? 'live' : 'dry-run', ...out });
  }));
  router.all('/cron/watch', cronOnly, asyncHandler(async (_req, res) => {
    const store = getStore();
    for (const s of SOURCES) {
      const have = (await store.listSources()).find((x) => x.url === s.url);
      if (!have) await store.saveSource({ url: s.url, label: s.label, notificationId: s.notificationId || undefined, enabled: true });
    }
    const results = await watcher.runWatcher({ store, nowIso: new Date(nowMs()).toISOString(), ...(fetchImpl ? { fetchImpl, delayMs: 0, sleep: async () => {} } : {}) });
    res.json({ success: true, results });
  }));

  return router;
}

module.exports = createRadarRouter();
module.exports.createRadarRouter = createRadarRouter;
