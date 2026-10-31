/**
 * The single server-side answer to "is this user premium?".
 * Reads premium_members across every id linked to the person. Fails closed: any error,
 * missing row, inactive status or expired date counts as free.
 */
const supabase = require('../config/supabase');
const { logger } = require('../utils/logger');
const { linkedIds } = require('./identity');

const CACHE_MS = 10_000;
const cache = new Map(); // userId -> { at, value }

function isActive(row, now = new Date()) {
  if (!row || row.subscription_status !== 'active') return false;
  return !row.premium_expires_at || new Date(row.premium_expires_at) > now;
}

const FREE = Object.freeze({ premium: false, plan: null, premiumSince: null, paymentId: null, orderId: null, amountInr: null });

async function getEntitlement(userId, { fresh = false } = {}) {
  if (!userId) return FREE;
  const hit = cache.get(userId);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  let value = FREE;
  try {
    const ids = await linkedIds(userId);
    const { data, error } = await supabase
      .from('premium_members')
      .select('user_id, plan_type, subscription_status, premium_expires_at, premium_since, updated_at, payment_id, order_id, amount_inr')
      .in('user_id', ids);
    if (error) throw new Error(error.message);
    const row = (data || []).find((r) => isActive(r));
    if (row) {
      value = {
        premium: true,
        plan: row.plan_type || 'lifetime',
        premiumSince: row.premium_since || row.updated_at || null,
        paymentId: row.payment_id || null,
        orderId: row.order_id || null,
        amountInr: row.amount_inr ?? null
      };
    }
  } catch (e) {
    logger.warn(`premium lookup failed, treating as free: ${e.message}`);
    return FREE; // not cached, so the next call retries
  }
  cache.set(userId, { at: Date.now(), value });
  return value;
}

async function isPremium(userId) {
  return (await getEntitlement(userId)).premium;
}

/** Call after any change to premium_members so the next read sees it. */
function invalidate() {
  cache.clear();
}

module.exports = { isPremium, getEntitlement, invalidate, isActive };
