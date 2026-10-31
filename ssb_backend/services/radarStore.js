'use strict';
/**
 * Persistence for Radar. Two interchangeable implementations of one interface:
 *  - memoryStore: used by tests and for local runs with RADAR_STORE=memory (nothing survives a restart)
 *  - supabaseStore: the real thing (service-role key required; RLS blocks the anon key from writing)
 * The supabase implementation could NOT be exercised in this build: the project URL does not resolve.
 */
const crypto = require('crypto');
const { toRow, fromRow } = require('./radarCore');

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const token = () => crypto.randomBytes(24).toString('base64url');

function memoryStore() {
  const notifications = new Map();
  const history = [];
  const sources = new Map();
  const reviews = [];
  const tracked = new Map(); // `${user}|${nid}`
  const prefs = new Map();
  const outbox = new Map(); // dedupe_key -> row
  let seq = 1;

  return {
    kind: 'memory',
    async listNotifications({ status } = {}) {
      return [...notifications.values()].filter((n) => !status || n.status === status).map(clone);
    },
    async getNotification(id) { return clone(notifications.get(id)) ?? null; },
    async saveNotification(n) { notifications.set(n.id, clone(n)); return clone(n); },
    async addHistory(h) { history.push({ id: seq++, createdAt: h.createdAt, ...clone(h) }); },
    async listHistory(id) { return history.filter((h) => h.notificationId === id).reverse().map(clone); },

    async listSources() { return [...sources.values()].map(clone); },
    async saveSource(s) { sources.set(s.url, { ...sources.get(s.url), ...clone(s) }); },
    async addReview(r) { const row = { id: seq++, status: 'open', ...clone(r) }; reviews.push(row); return clone(row); },
    async listReviews(status = 'open') { return reviews.filter((r) => r.status === status).reverse().map(clone); },
    async resolveReview(id, status, by, at) {
      const r = reviews.find((x) => x.id === Number(id));
      if (!r) return null;
      Object.assign(r, { status, resolvedBy: by, resolvedAt: at });
      return clone(r);
    },

    async listTracked(userId) { return [...tracked.values()].filter((t) => t.userId === userId).map(clone); },
    async listTrackedFor(notificationId) { return [...tracked.values()].filter((t) => t.notificationId === notificationId).map(clone); },
    async listAllTracked() { return [...tracked.values()].map(clone); },
    async upsertTracked(t) {
      const k = `${t.userId}|${t.notificationId}`;
      const cur = tracked.get(k);
      const row = { createdAt: t.updatedAt, ...cur, ...clone(t) };
      tracked.set(k, row);
      return clone(row);
    },
    async deleteTracked(userId, nid) { tracked.delete(`${userId}|${nid}`); },

    async getPrefs(userId) { return clone(prefs.get(userId)) ?? null; },
    async savePrefs(p) {
      const cur = prefs.get(p.userId) ?? { remindersEnabled: true, digest: false, unsubscribeToken: token(), timezone: 'Asia/Kolkata' };
      const row = { ...cur, ...clone(p) };
      prefs.set(p.userId, row);
      return clone(row);
    },
    async getPrefsByToken(t) { return clone([...prefs.values()].find((p) => p.unsubscribeToken === t)) ?? null; },
    async getPrefsByConfirmToken(t) { return clone([...prefs.values()].find((p) => p.confirmToken && p.confirmToken === t)) ?? null; },

    /** Returns true only for the call that created the row. The unique key is the idempotency guard. */
    async insertOutbox(o) {
      if (outbox.has(o.dedupeKey)) return null;
      const row = { id: seq++, status: 'queued', ...clone(o) };
      outbox.set(o.dedupeKey, row);
      return clone(row);
    },
    async updateOutbox(dedupeKey, patch) { Object.assign(outbox.get(dedupeKey), clone(patch)); },
    async listOutbox() { return [...outbox.values()].map(clone); },
  };
}

function supabaseStore(client) {
  const must = ({ data, error }) => { if (error) throw new Error(`radar store: ${error.message}`); return data; };
  const t = (n) => client.from(n);
  const trackedFrom = (r) => ({ userId: r.user_id, notificationId: r.notification_id, status: r.status, note: r.note ?? undefined, createdAt: r.created_at, updatedAt: r.updated_at });
  const prefsFrom = (r) => r && ({ userId: r.user_id, email: r.email ?? undefined, remindersEnabled: r.reminders_enabled, digest: r.digest, unsubscribeToken: r.unsubscribe_token, timezone: r.timezone, emailConfirmedFor: r.email_confirmed_for ?? undefined, confirmToken: r.confirm_token ?? undefined, trackerMigratedAt: r.tracker_migrated_at ?? undefined });
  const reviewFrom = (r) => ({ id: r.id, sourceUrl: r.source_url, label: r.label, notificationId: r.notification_id ?? undefined, diff: r.diff, status: r.status, createdAt: r.created_at });

  return {
    kind: 'supabase',
    async listNotifications({ status } = {}) {
      let q = t('radar_notifications').select('*');
      if (status) q = q.eq('status', status);
      return must(await q).map(fromRow);
    },
    async getNotification(id) { const d = must(await t('radar_notifications').select('*').eq('id', id).maybeSingle()); return d ? fromRow(d) : null; },
    async saveNotification(n) { must(await t('radar_notifications').upsert(toRow(n))); return n; },
    async addHistory(h) { must(await t('radar_history').insert({ notification_id: h.notificationId, action: h.action, changed_by: h.changedBy ?? null, changes: h.changes ?? {}, created_at: h.createdAt })); },
    async listHistory(id) {
      return must(await t('radar_history').select('*').eq('notification_id', id).order('created_at', { ascending: false }).limit(50))
        .map((r) => ({ id: r.id, notificationId: r.notification_id, action: r.action, changedBy: r.changed_by, changes: r.changes, createdAt: r.created_at }));
    },

    async listSources() {
      return must(await t('radar_sources').select('*')).map((r) => ({ url: r.url, label: r.label, notificationId: r.notification_id ?? undefined, enabled: r.enabled, contentHash: r.content_hash ?? undefined, contentText: r.content_text ?? undefined, lastCheckedAt: r.last_checked_at ?? undefined, lastChangedAt: r.last_changed_at ?? undefined, lastError: r.last_error ?? undefined }));
    },
    async saveSource(s) {
      const row = { url: s.url };
      const map = { label: 'label', notificationId: 'notification_id', enabled: 'enabled', contentHash: 'content_hash', contentText: 'content_text', lastCheckedAt: 'last_checked_at', lastChangedAt: 'last_changed_at', lastError: 'last_error' };
      for (const [k, c] of Object.entries(map)) if (k in s) row[c] = s[k] ?? null;
      must(await t('radar_sources').upsert(row));
    },
    async addReview(r) {
      return reviewFrom(must(await t('radar_review_items').insert({ source_url: r.sourceUrl, label: r.label, notification_id: r.notificationId ?? null, diff: r.diff, created_at: r.createdAt }).select().single()));
    },
    async listReviews(status = 'open') { return must(await t('radar_review_items').select('*').eq('status', status).order('created_at', { ascending: false })).map(reviewFrom); },
    async resolveReview(id, status, by, at) {
      const d = must(await t('radar_review_items').update({ status, resolved_by: by, resolved_at: at }).eq('id', id).select().maybeSingle());
      return d ? reviewFrom(d) : null;
    },

    async listTracked(userId) { return must(await t('tracked_applications').select('*').eq('user_id', userId)).map(trackedFrom); },
    async listTrackedFor(nid) { return must(await t('tracked_applications').select('*').eq('notification_id', nid)).map(trackedFrom); },
    async listAllTracked() { return must(await t('tracked_applications').select('*')).map(trackedFrom); },
    async upsertTracked(x) {
      const row = { user_id: x.userId, notification_id: x.notificationId, status: x.status, note: x.note ?? null, updated_at: x.updatedAt };
      return trackedFrom(must(await t('tracked_applications').upsert(row, { onConflict: 'user_id,notification_id' }).select().single()));
    },
    async deleteTracked(userId, nid) { must(await t('tracked_applications').delete().eq('user_id', userId).eq('notification_id', nid)); },

    async getPrefs(userId) { return prefsFrom(must(await t('radar_prefs').select('*').eq('user_id', userId).maybeSingle())); },
    async savePrefs(p) {
      const cur = await this.getPrefs(p.userId);
      const m = { ...(cur ?? { remindersEnabled: true, digest: false, unsubscribeToken: token(), timezone: 'Asia/Kolkata' }), ...p };
      const row = { user_id: m.userId, email: m.email ?? null, reminders_enabled: m.remindersEnabled, digest: m.digest, unsubscribe_token: m.unsubscribeToken, timezone: m.timezone, email_confirmed_for: m.emailConfirmedFor ?? null, confirm_token: m.confirmToken || null, tracker_migrated_at: m.trackerMigratedAt ?? null, updated_at: new Date().toISOString() };
      return prefsFrom(must(await t('radar_prefs').upsert(row).select().single()));
    },
    async getPrefsByToken(tok) { return prefsFrom(must(await t('radar_prefs').select('*').eq('unsubscribe_token', tok).maybeSingle())); },
    async getPrefsByConfirmToken(tok) { return prefsFrom(must(await t('radar_prefs').select('*').eq('confirm_token', tok).maybeSingle())); },

    async insertOutbox(o) {
      const { data, error } = await t('radar_outbox').insert({ dedupe_key: o.dedupeKey, user_id: o.userId, to_email: o.toEmail ?? null, kind: o.kind, subject: o.subject, body: o.body, created_at: o.createdAt }).select().single();
      if (error) {
        if (error.code === '23505') return null; // unique_violation: already queued/sent
        throw new Error(`radar store: ${error.message}`);
      }
      return { id: data.id, dedupeKey: data.dedupe_key, status: data.status };
    },
    async updateOutbox(key, p) { must(await t('radar_outbox').update({ status: p.status, error: p.error ?? null, sent_at: p.sentAt ?? null }).eq('dedupe_key', key)); },
    async listOutbox() { return must(await t('radar_outbox').select('*').order('created_at', { ascending: false }).limit(200)); },
  };
}

let singleton;
/** RADAR_STORE=memory forces the in-memory store. Otherwise Supabase with the service-role key. */
function getStore() {
  if (singleton) return singleton;
  if (process.env.RADAR_STORE === 'memory') { singleton = memoryStore(); return singleton; }
  const { createClient } = require('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.RADAR_SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('Radar needs SUPABASE_URL and RADAR_SUPABASE_SERVICE_KEY (or RADAR_STORE=memory for local runs).');
  singleton = supabaseStore(createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
  return singleton;
}
const setStore = (s) => { singleton = s; };

module.exports = { memoryStore, supabaseStore, getStore, setStore, token };
