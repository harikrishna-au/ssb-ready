const crypto = require('crypto');
const userData = require('../config/userData');
const { logger } = require('../utils/logger');

const BATCH = 400;

/** Dependencies are injected so the service can be tested without Supabase or Clerk. */
function defaultDeps() {
  const { db } = require('../config/db');
  const supabase = require('../config/supabase');
  return {
    db,
    supabase,
    deleteIdentity: async (user) => {
      if (!process.env.CLERK_SECRET_KEY) throw new Error('CLERK_SECRET_KEY missing');
      const { createClerkClient } = require('@clerk/backend');
      await createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY }).users.deleteUser(user.uid);
    },
    getIdentity: async (user) => {
      if (!process.env.CLERK_SECRET_KEY) return { id: user.uid, email: user.email || null };
      const { createClerkClient } = require('@clerk/backend');
      const u = await createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY }).users.getUser(user.uid);
      return {
        id: u.id,
        email: u.emailAddresses?.[0]?.emailAddress || null,
        firstName: u.firstName,
        lastName: u.lastName,
        createdAt: u.createdAt,
        publicMetadata: u.publicMetadata,
        unsafeMetadata: u.unsafeMetadata
      };
    }
  };
}

const toPlain = (v) => {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(toPlain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toPlain(x)]));
  return v;
};

async function exportUserData(user, deps = defaultDeps()) {
  const out = { exportedAt: new Date().toISOString(), userId: user.uid, account: null, documents: {}, supabase: {}, notes: [] };
  out.account = await deps.getIdentity(user);

  for (const c of userData.docsByField) {
    const snap = await deps.db.collection(c).where('userId', '==', user.uid).get();
    out.documents[c] = snap.docs.map((d) => ({ id: d.id, ...toPlain(d.data()) }));
  }
  for (const c of userData.docsById) {
    const doc = await deps.db.collection(c).doc(user.uid).get();
    out.documents[c] = doc.exists ? toPlain(doc.data()) : null;
  }
  for (const t of userData.supabaseTables) {
    const { data, error } = await deps.supabase.from(t.table).select(t.export).eq('user_id', user.uid);
    if (error) {
      out.supabase[t.table] = null;
      out.notes.push(`Could not read ${t.table}; try again later.`);
    } else {
      out.supabase[t.table] = data;
    }
  }
  return out;
}

async function deleteByField(db, collection, uid) {
  let removed = 0;
  // Loop in batches so large histories never hit a single huge delete.
  for (;;) {
    const snap = await db.collection(collection).where('userId', '==', uid).limit(BATCH).get();
    if (snap.empty) return removed;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    removed += snap.size;
  }
}

/**
 * Deletes everything we hold about a user. Safe to retry: each step is idempotent and the
 * sign-in identity is removed last, so a failed run can be repeated with the same login.
 */
async function deleteUserData(user, deps = defaultDeps()) {
  const uid = user.uid;
  const failed = [];
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      failed.push(name);
      logger.error('account deletion step failed', { step: name, err: e });
    }
  };

  for (const c of userData.docsByField) await step(`documents:${c}`, () => deleteByField(deps.db, c, uid));
  for (const c of userData.docsById) await step(`documents:${c}`, () => deps.db.collection(c).doc(uid).delete());
  for (const t of userData.supabaseTables) {
    await step(`supabase:${t.table}`, async () => {
      const q =
        t.onDelete === 'anonymise'
          ? deps.supabase
              .from(t.table)
              .update({ user_id: `deleted-${crypto.createHash('sha256').update(uid).digest('hex').slice(0, 16)}`, raw_response: null })
              .eq('user_id', uid)
          : deps.supabase.from(t.table).delete().eq('user_id', uid);
      const { error } = await q;
      if (error) throw new Error(error.message);
    });
  }
  // Identity last: if anything above failed we keep the login so the user can retry.
  if (failed.length === 0) await step('identity', () => deps.deleteIdentity(user));

  return { ok: failed.length === 0, failed };
}

module.exports = { exportUserData, deleteUserData };
