/**
 * Identity linking: one person can hold a Clerk id (web) and a Firebase uid (mobile).
 * Purchases are stored under the id that paid; entitlement checks expand to every linked id.
 *
 * A link is only ever created from two independently verified emails:
 *  - Clerk side: an email address Clerk marks as verified on that Clerk user.
 *  - Firebase side: the Firebase account for that address with emailVerified = true.
 * The client never supplies an id or an email to link, so a user can only link themselves.
 */
const supabase = require('../config/supabase');
const { logger } = require('../utils/logger');

const providerOf = (uid) => (typeof uid === 'string' && uid.startsWith('user_') ? 'clerk' : 'firebase');

// Replaceable in tests. Real implementations are lazy so the module loads without credentials.
const deps = {
  async clerkVerifiedEmails(clerkId) {
    const { createClerkClient } = require('@clerk/backend');
    const user = await createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY }).users.getUser(clerkId);
    return (user.emailAddresses || [])
      .filter((e) => e.verification && e.verification.status === 'verified')
      .map((e) => e.emailAddress.toLowerCase());
  },
  async clerkFindByVerifiedEmail(email) {
    const { createClerkClient } = require('@clerk/backend');
    const res = await createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY }).users.getUserList({ emailAddress: [email] });
    const list = Array.isArray(res) ? res : res.data || [];
    return list
      .filter((u) => (u.emailAddresses || []).some((e) => e.emailAddress.toLowerCase() === email && e.verification && e.verification.status === 'verified'))
      .map((u) => u.id);
  },
  async firebaseByEmail(email) {
    const { admin } = require('../config/firebase');
    try {
      const u = await admin.auth().getUserByEmail(email);
      return { uid: u.uid, emailVerified: !!u.emailVerified };
    } catch (e) {
      if (e && e.code === 'auth/user-not-found') return null;
      throw e;
    }
  },
  async firebaseUser(uid) {
    const { admin } = require('../config/firebase');
    const u = await admin.auth().getUser(uid);
    return { uid: u.uid, email: (u.email || '').toLowerCase(), emailVerified: !!u.emailVerified };
  }
};

/** Every id that belongs to the same person as `userId`, including `userId` itself. */
async function linkedIds(userId) {
  if (!userId) return [];
  const column = providerOf(userId) === 'clerk' ? 'clerk_id' : 'firebase_uid';
  const { data, error } = await supabase.from('user_identities').select('clerk_id, firebase_uid').eq(column, userId);
  if (error) {
    logger.warn(`user_identities lookup failed (${error.message}); using the single id`);
    return [userId];
  }
  const ids = new Set([userId]);
  for (const row of data || []) {
    if (row.clerk_id) ids.add(row.clerk_id);
    if (row.firebase_uid) ids.add(row.firebase_uid);
  }
  return [...ids];
}

async function insertLink({ clerkId, firebaseUid, email }) {
  const { error } = await supabase
    .from('user_identities')
    .insert({ clerk_id: clerkId, firebase_uid: firebaseUid, email, email_verified: true, linked_via: 'verified_email' });
  if (error) {
    if (error.code === '23505') return 'conflict'; // one of the two ids is already linked to someone
    throw new Error(error.message);
  }
  return 'linked';
}

/**
 * Links the caller to their counterpart login when both have the same verified email.
 * Returns { linked: boolean, reason?: string, ids: string[] }.
 */
async function linkByVerifiedEmail(userId) {
  const existing = await linkedIds(userId);
  if (existing.length > 1) return { linked: true, reason: 'already_linked', ids: existing };

  const provider = providerOf(userId);
  let pair = null;

  if (provider === 'clerk') {
    const emails = await deps.clerkVerifiedEmails(userId);
    for (const email of emails) {
      const fb = await deps.firebaseByEmail(email);
      if (fb && fb.emailVerified) { pair = { clerkId: userId, firebaseUid: fb.uid, email }; break; }
    }
  } else {
    const me = await deps.firebaseUser(userId);
    if (!me.email || !me.emailVerified) return { linked: false, reason: 'email_not_verified', ids: existing };
    const matches = await deps.clerkFindByVerifiedEmail(me.email);
    if (matches.length > 1) return { linked: false, reason: 'ambiguous', ids: existing };
    if (matches.length === 1) pair = { clerkId: matches[0], firebaseUid: userId, email: me.email };
  }

  if (!pair) return { linked: false, reason: 'no_matching_account', ids: existing };
  const outcome = await insertLink(pair);
  if (outcome === 'conflict') {
    logger.warn(`identity link refused: ${pair.clerkId} / ${pair.firebaseUid} already linked elsewhere`);
    return { linked: false, reason: 'conflict', ids: existing };
  }
  logger.info(`identity linked: ${pair.clerkId} <-> ${pair.firebaseUid}`);
  return { linked: true, reason: 'linked', ids: [pair.clerkId, pair.firebaseUid] };
}

module.exports = { providerOf, linkedIds, linkByVerifiedEmail, deps };
