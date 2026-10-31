/**
 * Razorpay Lifetime purchase: order creation, signature verification, webhook handling.
 *
 * Rules enforced here (never delegated to the client):
 *  - the amount is a server constant;
 *  - an order is only created when the PIQ stored in Firestore is complete;
 *  - premium is granted by exactly one function (`activate`) that is idempotent on order and payment id,
 *    and is called both by the browser redirect (verify) and by the webhook, whichever arrives first;
 *  - every state transition is written to payment_events.
 */
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { logger } = require('../utils/logger');
const { piqCompleteness } = require('./paymentsPiq');
const { getEntitlement, invalidate } = require('./premium');
const { linkedIds } = require('./identity');

const LIST_PRICE_INR = 499;
const DISCOUNT_INR = 200;
const PRICE_INR = LIST_PRICE_INR - DISCOUNT_INR; // 299
const PRICE_PAISE = PRICE_INR * 100;
const PLAN = 'lifetime';
const OPEN_ORDER_REUSE_MS = 30 * 60 * 1000;

const ORDER_ID = /^order_[A-Za-z0-9]{6,40}$/;
const PAYMENT_ID = /^pay_[A-Za-z0-9]{6,40}$/;

function httpError(statusCode, message, code) {
  const e = new Error(message);
  e.statusCode = statusCode;
  e.expose = true;
  if (code) e.code = code;
  return e;
}

// ---------------------------------------------------------------- dependencies (replaceable in tests)

const deps = {
  now: () => new Date(),
  /** PIQ as stored in Firestore for this user, or null. */
  async getPiq(userId) {
    const { db } = require('../config/firebase');
    const doc = await db.collection('piqs').doc(userId).get();
    return doc.exists ? doc.data() : null;
  },
  razorpay: {
    keyId: () => process.env.RAZORPAY_KEY_ID || '',
    async call(method, path, body) {
      const id = process.env.RAZORPAY_KEY_ID;
      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!id || !secret) throw httpError(503, 'Online payments are not configured yet.', 'PAYMENTS_UNAVAILABLE');
      const res = await fetch(`https://api.razorpay.com/v1${path}`, {
        method,
        headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        logger.warn(`Razorpay ${method} ${path} failed: ${res.status} ${json?.error?.description || ''}`);
        throw httpError(502, 'The payment provider did not accept the request. Please try again.', 'PROVIDER_ERROR');
      }
      return json;
    }
  },
  /** Best-effort side effects; failures never undo a payment. */
  async sendReceipt(row) { return require('./paymentsReceipt').sendReceiptEmail(row); },
  async syncProfile(ids, info) {
    try {
      const { db } = require('../config/firebase');
      await Promise.all(ids.filter((i) => !i.startsWith('user_')).map((uid) =>
        db.collection('users').doc(uid).set({ isPremium: info.premium, planType: info.premium ? PLAN : '', premiumOrderId: info.orderId || '', premiumPaymentId: info.paymentId || '' }, { merge: true })));
    } catch (e) {
      logger.warn(`Firestore premium sync skipped: ${e.message}`);
    }
  }
};

// ---------------------------------------------------------------- helpers

function hmacHex(message, secret) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Checkout signature: HMAC-SHA256(order_id|payment_id, key_secret). */
function verifyCheckoutSignature(orderId, paymentId, signature, secret = process.env.RAZORPAY_KEY_SECRET) {
  if (!secret) return false;
  return safeEqualHex(hmacHex(`${orderId}|${paymentId}`, secret), signature);
}

/** Webhook signature: HMAC-SHA256(raw body, webhook secret). */
function verifyWebhookSignature(rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  if (!secret) return false;
  return safeEqualHex(hmacHex(rawBody, secret), signature);
}

/** Splits a GST-inclusive total. Rate 0 (default) means no GST is charged or shown. */
function gstBreakup(totalPaise, ratePercent = Number(process.env.GST_RATE_PERCENT || 0)) {
  const rate = Number.isFinite(ratePercent) && ratePercent > 0 ? ratePercent : 0;
  const base = rate ? Math.round((totalPaise * 100) / (100 + rate)) : totalPaise;
  return { base_amount_paise: base, gst_rate_percent: rate, gst_amount_paise: totalPaise - base };
}

async function logEvent(e) {
  const { error } = await supabase.from('payment_events').insert({
    event_id: e.eventId || null, order_id: e.orderId || null, payment_id: e.paymentId || null, user_id: e.userId || null,
    kind: e.kind, from_status: e.from || null, to_status: e.to || null, detail: e.detail || null
  });
  if (error && error.code !== '23505') logger.warn(`payment_events insert failed: ${error.message}`);
  return !error;
}

async function getByOrder(orderId) {
  const { data, error } = await supabase.from('payment_transactions').select('*').eq('order_id', orderId).maybeSingle();
  if (error) throw httpError(500, 'Could not read the payment record.');
  return data || null;
}

// ---------------------------------------------------------------- rate limiting

const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map(); // `${bucket}:${userId}` -> timestamps
function rateLimit(bucket, userId, max) {
  const key = `${bucket}:${userId}`;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= max) {
    hits.set(key, recent);
    throw httpError(429, 'Too many attempts. Please wait a few minutes and try again.', 'RATE_LIMITED');
  }
  recent.push(now);
  hits.set(key, recent);
}
function resetRateLimits() { hits.clear(); }

// ---------------------------------------------------------------- create order

const inflight = new Map(); // userId -> Promise, collapses double clicks on one instance

async function createOrder({ userId, email }) {
  if (!userId) throw httpError(401, 'Not signed in.');
  if (inflight.has(userId)) return inflight.get(userId);
  const p = createOrderInner({ userId, email }).finally(() => inflight.delete(userId));
  inflight.set(userId, p);
  return p;
}

async function createOrderInner({ userId, email }) {
  rateLimit('order', userId, Number(process.env.PAYMENT_ORDER_LIMIT || 5));

  if ((await getEntitlement(userId, { fresh: true })).premium) {
    throw httpError(409, 'You already have Lifetime access.', 'ALREADY_PREMIUM');
  }

  let piq;
  try {
    piq = await deps.getPiq(userId);
  } catch (e) {
    logger.error(`PIQ read failed for ${userId}: ${e.message}`);
    throw httpError(503, 'Could not check your PIQ right now. Please try again.', 'PIQ_UNAVAILABLE');
  }
  if (!piqCompleteness(piq, deps.now).complete) {
    await logEvent({ kind: 'order_refused_piq', userId });
    throw httpError(403, 'Complete your PIQ before paying.', 'PIQ_INCOMPLETE');
  }

  // Re-use a recent unpaid order instead of piling up new ones (retry after cancel, page refresh).
  const since = new Date(Date.now() - OPEN_ORDER_REUSE_MS).toISOString();
  const { data: open } = await supabase
    .from('payment_transactions').select('*')
    .eq('user_id', userId).in('status', ['created', 'failed']).gte('created_at', since)
    .order('created_at', { ascending: false }).limit(1);
  if (open && open[0]) return orderResponse(open[0], piq, email);

  const receipt = `rk_${crypto.randomBytes(6).toString('hex')}`;
  const order = await deps.razorpay.call('POST', '/orders', {
    amount: PRICE_PAISE, currency: 'INR', receipt,
    notes: { uid: userId, plan: PLAN, amount_inr: String(PRICE_INR), list_price_inr: String(LIST_PRICE_INR) }
  });
  if (order.amount !== PRICE_PAISE) throw httpError(502, 'The payment provider returned an unexpected amount.', 'PROVIDER_ERROR');

  const row = {
    user_id: userId, txnid: order.id, order_id: order.id, amount: PRICE_INR, amount_paise: PRICE_PAISE, currency: 'INR',
    status: 'created', email: email || piq.email || null, source: 'web', provider_reference_id: order.id,
    raw_response: order, ...gstBreakup(PRICE_PAISE)
  };
  const { error } = await supabase.from('payment_transactions').insert(row);
  if (error) {
    logger.error(`could not store order ${order.id}: ${error.message}`);
    throw httpError(500, 'Could not start the payment. Please try again.');
  }
  await logEvent({ kind: 'order_created', orderId: order.id, userId, to: 'created' });
  return orderResponse(row, piq, email);
}

function orderResponse(row, piq, email) {
  return {
    keyId: deps.razorpay.keyId(),
    orderId: row.order_id,
    amountPaise: row.amount_paise,
    amountInr: row.amount,
    currency: row.currency,
    prefill: { name: piq?.fullName || '', email: email || piq?.email || row.email || '', contact: piq?.phone || '' }
  };
}

// ---------------------------------------------------------------- activation (single path to premium)

function receiptNumber(paymentId) {
  return `RK-${paymentId.replace(/^pay_/, '').toUpperCase()}`;
}

/** Writes the entitlement. Idempotent (upserts), so it is safe to repeat to heal a half-finished grant. */
async function ensureEntitlement(row, paymentId) {
  const now = deps.now().toISOString();
  const base = {
    user_id: row.user_id, email: row.email, plan_type: PLAN, subscription_id: paymentId,
    subscription_status: 'active', premium_expires_at: null, updated_at: now
  };
  const p = await supabase.from('profiles').upsert({ ...base, is_premium: true }, { onConflict: 'user_id' });
  if (p.error) throw new Error(`profiles upsert: ${p.error.message}`);
  // premium_since is only set when there is no row yet or the previous one was not active.
  const { data: existing } = await supabase.from('premium_members').select('premium_since, subscription_status').eq('user_id', row.user_id).maybeSingle();
  const since = existing && existing.subscription_status === 'active' && existing.premium_since ? existing.premium_since : (row.paid_at || now);
  const m = await supabase.from('premium_members').upsert(
    { ...base, order_id: row.order_id, payment_id: paymentId, amount_inr: row.amount, premium_since: since },
    { onConflict: 'user_id' });
  if (m.error) throw new Error(`premium_members upsert: ${m.error.message}`);
  invalidate();
}

/**
 * Marks the order paid and grants Lifetime access. Safe to call any number of times, from verify
 * and from the webhook, in any order. Returns { row, firstTime }.
 */
async function activate({ orderId, paymentId, via }) {
  const before = await getByOrder(orderId);
  if (!before) throw httpError(404, 'Unknown order.', 'UNKNOWN_ORDER');
  if (before.status === 'refunded') throw httpError(409, 'This payment was refunded.', 'REFUNDED');
  if (before.payment_id && before.payment_id !== paymentId) {
    await logEvent({ kind: 'payment_id_mismatch', orderId, paymentId, userId: before.user_id, detail: { recorded: before.payment_id, via } });
    paymentId = before.payment_id; // the first captured payment wins; never swap it
  }

  const paidAt = deps.now().toISOString();
  const { data: moved, error } = await supabase
    .from('payment_transactions')
    .update({
      status: 'paid', payment_id: paymentId, provider_reference_id: paymentId, paid_at: paidAt,
      receipt_no: receiptNumber(paymentId), failure_reason: null, updated_at: paidAt
    })
    .eq('order_id', orderId).in('status', ['created', 'failed']).select();

  let row; let firstTime = false;
  if (error) {
    if (error.code === '23505') {
      // That payment id is already attached to another order: refuse, do not grant twice.
      await logEvent({ kind: 'duplicate_payment_id', orderId, paymentId, userId: before.user_id, detail: { via } });
      throw httpError(409, 'This payment has already been used.', 'DUPLICATE_PAYMENT');
    }
    throw new Error(error.message);
  }
  if (moved && moved.length) {
    row = moved[0]; firstTime = true;
    await logEvent({ kind: `activate:${via}`, orderId, paymentId, userId: row.user_id, from: before.status, to: 'paid' });
  } else {
    row = await getByOrder(orderId); // someone else moved it first
    if (!row || row.status !== 'paid') throw httpError(409, 'Payment is not in a state that can be activated.', 'BAD_STATE');
  }

  await ensureEntitlement(row, row.payment_id);
  if (firstTime) {
    await logEvent({ kind: 'entitlement_granted', orderId, paymentId: row.payment_id, userId: row.user_id });
    const ids = await linkedIds(row.user_id);
    await deps.syncProfile(ids, { premium: true, orderId, paymentId: row.payment_id });
    deps.sendReceipt(row).then(async (sent) => {
      if (sent) await supabase.from('payment_transactions').update({ receipt_emailed_at: deps.now().toISOString() }).eq('order_id', orderId);
    }).catch((e) => logger.warn(`receipt email failed: ${e.message}`));
  }
  return { row, firstTime };
}

// ---------------------------------------------------------------- verify (browser redirect)

async function verifyPayment({ userId, orderId, paymentId, signature }) {
  if (!ORDER_ID.test(orderId || '') || !PAYMENT_ID.test(paymentId || '') || typeof signature !== 'string' || !signature) {
    throw httpError(400, 'Missing or malformed payment details.', 'BAD_REQUEST');
  }
  rateLimit('verify', userId, 30);

  const row = await getByOrder(orderId);
  const ids = await linkedIds(userId);
  if (!row || !ids.includes(row.user_id)) {
    // Same answer for "does not exist" and "not yours": do not reveal other people's orders.
    throw httpError(404, 'Order not found.', 'UNKNOWN_ORDER');
  }
  if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
    await logEvent({ kind: 'verify_bad_signature', orderId, paymentId, userId });
    throw httpError(400, 'Payment signature did not match.', 'BAD_SIGNATURE');
  }
  if (row.status === 'paid' && row.payment_id === paymentId) {
    await ensureEntitlement(row, paymentId); // idempotent; heals a half-finished grant
    return { status: 'paid', alreadyProcessed: true };
  }

  // Confirm with Razorpay that this payment belongs to this order, for our price.
  const payment = await deps.razorpay.call('GET', `/payments/${paymentId}`);
  if (payment.order_id !== orderId || payment.amount !== row.amount_paise || payment.currency !== 'INR') {
    await logEvent({ kind: 'verify_mismatch', orderId, paymentId, userId, detail: { amount: payment.amount, order: payment.order_id } });
    throw httpError(400, 'Payment details did not match the order.', 'MISMATCH');
  }
  let status = payment.status;
  if (status === 'authorized') {
    const captured = await deps.razorpay.call('POST', `/payments/${paymentId}/capture`, { amount: row.amount_paise, currency: 'INR' });
    status = captured.status;
  }
  if (status !== 'captured') {
    // Not final yet. The webhook will complete it; the browser can poll order status.
    await logEvent({ kind: 'verify_pending', orderId, paymentId, userId, detail: { status } });
    return { status: 'pending' };
  }
  const { firstTime } = await activate({ orderId, paymentId, via: 'verify' });
  return { status: 'paid', alreadyProcessed: !firstTime };
}

async function orderStatus({ userId, orderId }) {
  if (!ORDER_ID.test(orderId || '')) throw httpError(400, 'Malformed order id.', 'BAD_REQUEST');
  const row = await getByOrder(orderId);
  const ids = await linkedIds(userId);
  if (!row || !ids.includes(row.user_id)) throw httpError(404, 'Order not found.', 'UNKNOWN_ORDER');
  return { orderId, status: row.status, paymentId: row.payment_id || null };
}

// ---------------------------------------------------------------- webhook

const toStr = (v) => (typeof v === 'string' ? v : '');

async function handleWebhook({ rawBody, signature, eventId }) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) throw httpError(503, 'Webhook secret is not configured.', 'WEBHOOK_UNCONFIGURED');
  if (!verifyWebhookSignature(rawBody, signature)) throw httpError(400, 'Invalid webhook signature.', 'BAD_SIGNATURE');

  let event;
  try { event = JSON.parse(rawBody); } catch { throw httpError(400, 'Invalid webhook body.', 'BAD_REQUEST'); }
  const type = toStr(event.event);
  eventId = toStr(eventId) || `${type}:${toStr(event.payload?.payment?.entity?.id)}:${toStr(event.payload?.refund?.entity?.id)}:${event.created_at || ''}`;

  const { data: seen } = await supabase.from('payment_events').select('id').eq('event_id', eventId).maybeSingle();
  if (seen) return { replay: true };

  const payment = event.payload?.payment?.entity || {};
  const refund = event.payload?.refund?.entity || {};
  const orderId = toStr(payment.order_id) || toStr(event.payload?.order?.entity?.id);
  const paymentId = toStr(payment.id) || toStr(refund.payment_id);
  let outcome = 'ignored';

  if (type === 'payment.captured' || type === 'order.paid') {
    const row = orderId ? await getByOrder(orderId) : null;
    if (!row) outcome = 'unknown_order';
    else if (payment.amount !== row.amount_paise || payment.currency !== 'INR') {
      outcome = 'amount_mismatch';
      await logEvent({ kind: 'webhook_amount_mismatch', orderId, paymentId, userId: row.user_id, detail: { amount: payment.amount } });
    } else {
      try { await activate({ orderId, paymentId, via: 'webhook' }); outcome = 'activated'; }
      catch (e) { if (e.statusCode && e.statusCode < 500) outcome = e.code || 'refused'; else throw e; }
    }
  } else if (type === 'payment.failed') {
    const row = orderId ? await getByOrder(orderId) : null;
    if (row && row.status === 'created') {
      const reason = toStr(payment.error_description) || toStr(payment.error_code) || 'failed';
      await supabase.from('payment_transactions').update({ status: 'failed', failure_reason: reason, updated_at: deps.now().toISOString() })
        .eq('order_id', orderId).eq('status', 'created');
      await logEvent({ kind: 'webhook:payment.failed', orderId, paymentId, userId: row.user_id, from: 'created', to: 'failed', detail: { reason } });
      outcome = 'failed';
    }
  } else if (type === 'refund.processed') {
    const { data: row } = await supabase.from('payment_transactions').select('*').eq('payment_id', paymentId).maybeSingle();
    if (row && row.status === 'paid' && Number(refund.amount) >= row.amount_paise) {
      const at = deps.now().toISOString();
      await supabase.from('payment_transactions').update({ status: 'refunded', refunded_at: at, updated_at: at }).eq('order_id', row.order_id).eq('status', 'paid');
      await supabase.from('premium_members').update({ subscription_status: 'refunded', premium_expires_at: at, updated_at: at })
        .eq('user_id', row.user_id).eq('payment_id', paymentId);
      await supabase.from('profiles').update({ is_premium: false, subscription_status: 'refunded', updated_at: at }).eq('user_id', row.user_id);
      invalidate();
      await deps.syncProfile(await linkedIds(row.user_id), { premium: false });
      await logEvent({ kind: 'webhook:refund.processed', orderId: row.order_id, paymentId, userId: row.user_id, from: 'paid', to: 'refunded' });
      outcome = 'refunded';
    } else if (row) {
      outcome = 'partial_or_repeat_refund_ignored';
    }
  }

  await logEvent({ eventId, kind: `webhook:${type || 'unknown'}`, orderId, paymentId, detail: { outcome } });
  return { replay: false, outcome };
}

// ---------------------------------------------------------------- billing history

async function listPayments(userId) {
  const ids = await linkedIds(userId);
  const { data, error } = await supabase
    .from('payment_transactions')
    .select('order_id, payment_id, status, amount, amount_paise, currency, base_amount_paise, gst_rate_percent, gst_amount_paise, receipt_no, source, email, created_at, paid_at, refunded_at, failure_reason')
    .in('user_id', ids).in('status', ['paid', 'failed', 'refunded'])
    .order('created_at', { ascending: false });
  if (error) throw httpError(500, 'Could not load your payments.');
  return (data || []).map((r) => ({
    orderId: r.order_id, paymentId: r.payment_id, status: r.status, amountInr: r.amount, currency: r.currency,
    baseAmountInr: r.base_amount_paise != null ? r.base_amount_paise / 100 : r.amount,
    gstRatePercent: Number(r.gst_rate_percent || 0), gstAmountInr: (r.gst_amount_paise || 0) / 100,
    gstin: process.env.BUSINESS_GSTIN || null,
    receiptNo: r.receipt_no, source: r.source, email: r.email, createdAt: r.created_at, paidAt: r.paid_at,
    refundedAt: r.refunded_at, failureReason: r.failure_reason
  }));
}

module.exports = {
  PRICE_INR, PRICE_PAISE, PLAN, deps, httpError,
  createOrder, verifyPayment, orderStatus, handleWebhook, activate, listPayments,
  verifyCheckoutSignature, verifyWebhookSignature, gstBreakup, resetRateLimits
};
