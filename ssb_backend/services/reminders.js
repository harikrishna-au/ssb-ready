'use strict';
/**
 * Deadline reminders, change notices and the daily digest.
 * Idempotency: every message has a deterministic dedupe key and is inserted into the outbox first;
 * only the call that actually created the row sends. Re-running the job, or two jobs overlapping,
 * therefore never produce a second email.
 */
const core = require('./radarCore');

const SITE = () => (process.env.RADAR_SITE_URL || 'https://readykadet.com').replace(/\/$/, '');
const API = () => (process.env.PUBLIC_URL || process.env.BACKEND_PUBLIC_URL || '').replace(/\/$/, '');
const unsubUrl = (p) => `${API()}/api/radar/unsubscribe?token=${encodeURIComponent(p.unsubscribeToken)}`;
/** Mail only goes to an address the user proved is theirs (verified account email + clicked our confirmation link). */
const canMail = (p) => !!(p && p.remindersEnabled && p.email && p.emailConfirmedFor === p.email);
const fmt = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const when = (d) => (d === 1 ? 'tomorrow' : `in ${d} days`);

const footer = (p) => `\n\nOfficial dates can change. Confirm on the official site before you act.\nManage reminders: ${SITE()}/applications\nStop these emails: ${unsubUrl(p)}`;

function deadlineMail(n, offset, p) {
  return {
    subject: `${n.title}: last date ${when(offset)} (${fmt(n.lastDate)})`,
    body: `The last date to apply for ${n.title} is ${fmt(n.lastDate)}, ${when(offset)}. You saved it but have not marked it as applied.\n\nApply on the official site: ${n.officialApplyUrl}${footer(p)}`,
  };
}
function changeMail(n, changes, p) {
  const lines = Object.entries(changes).filter(([k]) => ['opens', 'lastDate', 'examDate', 'status', 'confidence'].includes(k))
    .map(([k, v]) => `- ${k === 'lastDate' ? 'Last date' : k === 'examDate' ? 'Exam date' : k === 'opens' ? 'Opens' : k}: ${v.from ?? 'not set'} -> ${v.to ?? 'not set'}`);
  return {
    subject: `Update: ${n.title}`,
    body: `A notification you track was updated.\n\n${n.title}\n${lines.join('\n') || '- Details updated.'}\n\nOfficial site: ${n.officialApplyUrl}${footer(p)}`,
  };
}
function digestMail(today, entries, p) {
  return {
    subject: `Your Radar digest for ${fmt(today)}`,
    body: `Deadlines coming up for what you track:\n\n${entries.map((e) => `- ${e.n.title}: last date ${fmt(e.n.lastDate)} (${when(e.d)})`).join('\n')}${footer(p)}`,
  };
}

/** Enqueue + send one message exactly once. Returns 'sent' | 'dry_run' | 'failed' | 'duplicate' | 'skipped'. */
async function deliver({ store, mailer, nowIso }, { key, userId, p, kind, mail }) {
  if (!p?.email) {
    const row = await store.insertOutbox({ dedupeKey: key, userId, kind, subject: mail.subject, body: mail.body, createdAt: nowIso });
    if (!row) return 'duplicate';
    await store.updateOutbox(key, { status: 'skipped', error: 'no email address on file' });
    return 'skipped';
  }
  const row = await store.insertOutbox({ dedupeKey: key, userId, toEmail: p.email, kind, subject: mail.subject, body: mail.body, createdAt: nowIso });
  if (!row) return 'duplicate';
  try {
    const r = await mailer.send({ to: p.email, subject: mail.subject, text: mail.body, unsubscribeUrl: unsubUrl(p) });
    await store.updateOutbox(key, { status: r.dryRun ? 'dry_run' : 'sent', sentAt: nowIso });
    return r.dryRun ? 'dry_run' : 'sent';
  } catch (e) {
    await store.updateOutbox(key, { status: 'failed', error: String(e.message).slice(0, 300) });
    return 'failed';
  }
}

const confirmUrl = (p) => `${API()}/api/radar/confirm?token=${encodeURIComponent(p.confirmToken)}`;
/** Asks the user to confirm the address before any reminder is sent. At most one per address per day. */
async function sendConfirmation({ store, mailer, nowMs }, p) {
  const today = core.istToday(nowMs);
  const mail = {
    subject: 'Confirm your Radar reminder emails',
    body: `Someone (hopefully you) asked for ReadyKadet Radar deadline reminders at this address.\n\nTo turn them on, confirm here: ${confirmUrl(p)}\n\nIf this was not you, ignore this email and nothing will be sent.\nStop these emails: ${unsubUrl(p)}`,
  };
  const key = `confirm:${today}:${p.userId}:${p.email}`;
  const row = await store.insertOutbox({ dedupeKey: key, userId: p.userId, toEmail: p.email, kind: 'confirm', subject: mail.subject, body: mail.body, createdAt: new Date(nowMs).toISOString() });
  if (!row) return 'duplicate';
  try {
    const r = await mailer.send({ to: p.email, subject: mail.subject, text: mail.body, unsubscribeUrl: unsubUrl(p) });
    await store.updateOutbox(key, { status: r.dryRun ? 'dry_run' : 'sent', sentAt: new Date(nowMs).toISOString() });
    return r.dryRun ? 'dry_run' : 'sent';
  } catch (e) {
    await store.updateOutbox(key, { status: 'failed', error: String(e.message).slice(0, 300) });
    return 'failed';
  }
}

/** Daily job. `nowMs` injected so windows are testable. */
async function runDailyReminders({ store, mailer, nowMs }) {
  const nowIso = new Date(nowMs).toISOString();
  const today = core.istToday(nowMs);
  const out = { today, considered: 0, sent: 0, dry_run: 0, skipped: 0, duplicate: 0, failed: 0 };
  const count = (r) => { out[r] += 1; };

  const notifications = new Map((await store.listNotifications({ status: 'published' })).map((n) => [n.id, n]));
  const tracked = await store.listAllTracked();
  const prefsCache = new Map();
  const prefsFor = async (u) => { if (!prefsCache.has(u)) prefsCache.set(u, await store.getPrefs(u)); return prefsCache.get(u); };
  const digests = new Map(); // userId -> entries

  for (const t of tracked) {
    const n = notifications.get(t.notificationId);
    if (!n) continue;
    if (t.status !== 'saved') continue; // already applied (or further): no nagging
    const offset = core.dueOffset(n.lastDate, today);
    if (!offset) continue;
    const p = await prefsFor(t.userId);
    if (!canMail(p)) continue;
    out.considered += 1;
    if (p.digest) {
      if (!digests.has(t.userId)) digests.set(t.userId, []);
      digests.get(t.userId).push({ n, d: offset });
      continue;
    }
    count(await deliver({ store, mailer, nowIso }, { key: core.deadlineKey(n, offset, t.userId), userId: t.userId, p, kind: 'deadline', mail: deadlineMail(n, offset, p) }));
  }
  for (const [userId, entries] of digests) {
    const p = await prefsFor(userId);
    count(await deliver({ store, mailer, nowIso }, { key: core.digestKey(today, userId), userId, p, kind: 'digest', mail: digestMail(today, entries, p) }));
  }
  return out;
}

/** Called when a published entry changes or is published: tell the people tracking it. */
async function notifyChange({ store, mailer, nowMs }, n, changes) {
  const nowIso = new Date(nowMs).toISOString();
  const out = { sent: 0, dry_run: 0, skipped: 0, duplicate: 0, failed: 0 };
  const material = Object.keys(changes).some((k) => ['opens', 'lastDate', 'examDate', 'status', 'confidence'].includes(k));
  if (!material) return out; // typo fixes in the title/body do not email anyone
  for (const t of await store.listTrackedFor(n.id)) {
    const p = await store.getPrefs(t.userId);
    if (!canMail(p)) continue;
    const r = await deliver({ store, mailer, nowIso }, { key: core.changeKey(n, t.userId), userId: t.userId, p, kind: 'change', mail: changeMail(n, changes, p) });
    out[r] += 1;
  }
  return out;
}

/**
 * Mailer behind an env flag. Live sending only when RADAR_EMAIL_MODE=live AND RESEND_API_KEY is set;
 * anything else is a dry run (the outbox row is the record). Never sends in tests.
 */
function createMailer(env = process.env, fetchImpl = globalThis.fetch) {
  const live = env.RADAR_EMAIL_MODE === 'live' && !!env.RESEND_API_KEY && !!env.RADAR_EMAIL_FROM;
  return {
    live,
    async send({ to, subject, text, unsubscribeUrl }) {
      if (!live) return { dryRun: true };
      const res = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.RADAR_EMAIL_FROM, to: [to], subject, text,
          headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        }),
      });
      if (!res.ok) throw new Error(`email provider returned ${res.status}`);
      return { dryRun: false };
    },
  };
}

module.exports = { sendConfirmation, canMail, runDailyReminders, notifyChange, createMailer, deadlineMail, changeMail, digestMail };
