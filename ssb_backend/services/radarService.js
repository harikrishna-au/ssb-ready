'use strict';
const core = require('./radarCore');

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const httpError = (status, message, extra) => Object.assign(new Error(message), { statusCode: status, ...extra });

const EDITABLE = ['title', 'body', 'conductedBy', 'service', 'exam', 'opens', 'lastDate', 'examDate', 'confidence', 'sourceUrl', 'officialApplyUrl', 'applyLabel', 'verifiedOn'];

function clean(input) {
  const out = {};
  for (const k of EDITABLE) if (k in input) out[k] = typeof input[k] === 'string' ? input[k].trim() || undefined : input[k] ?? undefined;
  if (out.service && !core.SERVICES.includes(out.service)) throw httpError(400, 'Unknown service.');
  if (out.confidence && !core.CONFIDENCE.includes(out.confidence)) throw httpError(400, 'Unknown confidence.');
  for (const k of ['opens', 'lastDate', 'examDate', 'verifiedOn']) if (out[k] && !core.isIsoDate(out[k])) throw httpError(400, `${k} must be yyyy-mm-dd.`);
  for (const k of ['sourceUrl', 'officialApplyUrl']) if (out[k] && !/^https?:\/\//.test(out[k])) throw httpError(400, `${k} must be a web link.`);
  return out;
}

/** Service factory so tests can inject the store, clock and change-notice hook. */
function createRadarService({ store, now = () => new Date().toISOString(), onChange = async () => {} }) {
  const record = (id, action, by, changes) => store.addHistory({ notificationId: id, action, changedBy: by, changes, createdAt: now() });

  return {
    async create(input, by) {
      const f = clean(input);
      const id = slug(input.id || f.title || '');
      if (!id) throw httpError(400, 'A title is needed.');
      if (await store.getNotification(id)) throw httpError(409, 'An entry with this id already exists.');
      const n = {
        body: '', applyLabel: 'Official site', confidence: 'expected', ...f, id, status: 'draft', version: 1, createdAt: now(), updatedAt: now(),
      };
      for (const k of ['title', 'conductedBy', 'service', 'exam']) if (!n[k]) throw httpError(400, `${k} is required.`);
      await store.saveNotification(n);
      await record(id, 'created', by, core.diffFields({}, n));
      return n;
    },

    async update(id, input, by) {
      const cur = await store.getNotification(id);
      if (!cur) throw httpError(404, 'Not found.');
      const next = { ...cur, ...clean(input) };
      for (const k of ['opens', 'lastDate', 'examDate']) if (k in input && !input[k]) next[k] = undefined;
      const changes = core.diffFields(cur, next);
      if (!Object.keys(changes).length) return cur;
      if (next.status === 'published') {
        const problems = core.publishProblems(next);
        if (problems.length) throw httpError(422, 'This entry is live, so it must keep its source and checked date.', { problems });
      }
      next.version = cur.version + 1;
      next.updatedAt = now();
      await store.saveNotification(next);
      await record(id, 'updated', by, changes);
      if (next.status === 'published') await onChange(next, changes);
      return next;
    },

    async publish(id, by) {
      const cur = await store.getNotification(id);
      if (!cur) throw httpError(404, 'Not found.');
      const problems = core.publishProblems(cur);
      if (problems.length) throw httpError(422, 'Cannot publish yet.', { problems });
      if (cur.status === 'published') return cur;
      const next = { ...cur, status: 'published', verifiedBy: by, version: cur.version + 1, updatedAt: now() };
      await store.saveNotification(next);
      await record(id, 'published', by, { status: { from: cur.status, to: 'published' } });
      await onChange(next, { status: { from: cur.status, to: 'published' } });
      return next;
    },

    async archive(id, by) {
      const cur = await store.getNotification(id);
      if (!cur) throw httpError(404, 'Not found.');
      if (cur.status === 'archived') return cur;
      const next = { ...cur, status: 'archived', version: cur.version + 1, updatedAt: now() };
      await store.saveNotification(next);
      await record(id, 'archived', by, { status: { from: cur.status, to: 'archived' } });
      return next;
    },

    /** "Verified on" stamp: a human looked at the official source today and nothing needed changing. */
    async stampVerified(id, by, today) {
      const cur = await store.getNotification(id);
      if (!cur) throw httpError(404, 'Not found.');
      const next = { ...cur, verifiedOn: today, verifiedBy: by, updatedAt: now() };
      await store.saveNotification(next);
      await record(id, 'verified', by, { verifiedOn: { from: cur.verifiedOn ?? null, to: today } });
      return next;
    },

    async listPublic() {
      return (await store.listNotifications({ status: 'published' })).map(core.toPublic);
    },

    // ---- tracker ----
    async getTracker(userId) {
      const rows = await store.listTracked(userId);
      const prefs = await store.getPrefs(userId);
      return { apps: Object.fromEntries(rows.map((r) => [r.notificationId, { status: r.status, note: r.note, updatedAt: r.updatedAt }])), migrated: !!prefs?.trackerMigratedAt };
    },
    async setTracked(userId, notificationId, patch) {
      const n = await store.getNotification(notificationId);
      const existing = (await store.listTracked(userId)).find((r) => r.notificationId === notificationId);
      if (!existing && (!n || n.status !== 'published')) throw httpError(404, 'That notification is not available.');
      if (patch.status !== undefined && !core.STAGES.includes(patch.status)) throw httpError(400, 'Unknown status.');
      if (patch.note !== undefined && (typeof patch.note !== 'string' || patch.note.length > 160)) throw httpError(400, 'Note is too long.');
      const row = await store.upsertTracked({
        userId, notificationId,
        status: patch.status ?? existing?.status ?? 'saved',
        note: patch.note !== undefined ? patch.note : existing?.note,
        updatedAt: now(),
      });
      return { status: row.status, note: row.note, updatedAt: row.updatedAt };
    },
    async removeTracked(userId, id) { await store.deleteTracked(userId, id); },
    /** One-time import of the Clerk-metadata tracker. Safe to call twice: the second call is a no-op. */
    async importLegacy(userId, legacy) {
      const prefs = await store.getPrefs(userId);
      if (prefs?.trackerMigratedAt) return { imported: 0, already: true };
      const rows = core.mergeLegacyTracker(await store.listTracked(userId), legacy);
      for (const r of rows) await store.upsertTracked({ userId, ...r, updatedAt: r.updatedAt || now() });
      await store.savePrefs({ userId, trackerMigratedAt: now() });
      return { imported: rows.length, already: false };
    },

    // ---- prefs ----
    async getPrefs(userId) {
      return (await store.getPrefs(userId)) ?? (await store.savePrefs({ userId }));
    },
    async setPrefs(userId, p) {
      const patch = { userId };
      if (typeof p.remindersEnabled === 'boolean') patch.remindersEnabled = p.remindersEnabled;
      if (typeof p.digest === 'boolean') patch.digest = p.digest;
      if (typeof p.email === 'string') {
        const email = p.email.trim();
        const cur = await store.getPrefs(userId);
        patch.email = email;
        // A different address than the confirmed one needs a fresh confirmation.
        if (email && cur?.emailConfirmedFor !== email) patch.confirmToken = require('./radarStore').token();
        if (!email) patch.confirmToken = '';
      }
      return store.savePrefs(patch);
    },
    /** Double opt-in: only the holder of the emailed token confirms the address. */
    async confirmEmail(tok) {
      const p = tok ? await store.getPrefsByConfirmToken(tok) : null;
      if (!p || !p.email) return false;
      await store.savePrefs({ userId: p.userId, emailConfirmedFor: p.email, confirmToken: '', remindersEnabled: true });
      return true;
    },
    async unsubscribe(tok) {
      const p = tok ? await store.getPrefsByToken(tok) : null;
      if (!p) return false;
      await store.savePrefs({ userId: p.userId, remindersEnabled: false });
      return true;
    },
  };
}

module.exports = { createRadarService, httpError };
