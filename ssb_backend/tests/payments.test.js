const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const path = require('path');
const { createFake } = require('./fakeSupabase');

process.env.RAZORPAY_KEY_ID = 'rzp_test_fixture';
process.env.RAZORPAY_KEY_SECRET = 'fixture_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'fixture_webhook_secret';

const fake = createFake({
  payment_transactions: [['order_id'], ['payment_id'], ['txnid']],
  payment_events: [['event_id']]
});
const supaPath = require.resolve(path.join(__dirname, '../config/supabase'));
require.cache[supaPath] = { id: supaPath, filename: supaPath, loaded: true, exports: fake };

const payments = require('../services/payments');
const premium = require('../services/premium');
const { piqCompleteness } = require('../services/paymentsPiq');

const NOW = new Date('2026-11-02T10:00:00Z');
const GOOD_PIQ = {
  fullName: 'A Cadet', dateOfBirth: '2005-03-01', gender: 'Male', phone: '9876543210', email: 'a@x.com',
  placeOfResidence: 'Pune', district: 'Pune', state: 'MH', motherTongue: 'Marathi', maritalStatus: 'Unmarried',
  currentStatus: 'Graduate', tenthPercentage: '88', twelfthPercentage: '80', twelfthStream: 'Science',
  fatherOccupation: 'Farmer', motherOccupation: 'Homemaker', gamesSports: 'Cricket', hobbies: 'Reading',
  examApplying: 'NDA', servicePreference: 'Army', previousAttempts: '0',
  whyJoin: 'I want to serve the country and lead people under pressure.'
};

let razorCalls; let piqStore; let payStatus; let orderSeq; let receipts;
function reset() {
  for (const k of Object.keys(fake.tables)) fake.tables[k].length = 0;
  premium.invalidate(); payments.resetRateLimits();
  razorCalls = []; piqStore = { clerk_1: { ...GOOD_PIQ } }; payStatus = 'captured'; orderSeq = 0; receipts = [];
  payments.deps.now = () => NOW;
  payments.deps.getPiq = async (id) => piqStore[id] ?? null;
  payments.deps.syncProfile = async () => {};
  payments.deps.sendReceipt = async (row) => { receipts.push(row.order_id); return true; };
  payments.deps.razorpay.call = async (method, p, body) => {
    razorCalls.push([method, p, body]);
    if (method === 'POST' && p === '/orders') { orderSeq++; return { id: `order_TEST${orderSeq}ABCDEF`, amount: body.amount, currency: 'INR' }; }
    if (method === 'GET' && p.startsWith('/payments/')) {
      const id = p.split('/')[2];
      const order = fake.tables.payment_transactions.find((r) => id.endsWith(r.order_id.slice(-4)) || true);
      return { id, order_id: order.order_id, amount: order.amount_paise, currency: 'INR', status: payStatus };
    }
    if (p.endsWith('/capture')) return { status: 'captured' };
    throw new Error(`unexpected ${method} ${p}`);
  };
}
const sig = (o, p) => crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${o}|${p}`).digest('hex');
const hook = (event, payload, id) => {
  const raw = JSON.stringify({ event, payload, created_at: 1 });
  return { rawBody: raw, signature: crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex'), eventId: id };
};
const capturedPayload = (o, p, amount = 29900) => ({ payment: { entity: { id: p, order_id: o, amount, currency: 'INR' } } });
const rejects = (fn, code) => assert.rejects(fn, (e) => { assert.equal(e.code, code, `got ${e.code}: ${e.message}`); return true; });

test.beforeEach(reset);

test('PIQ completeness mirrors the web rules', () => {
  assert.equal(piqCompleteness(GOOD_PIQ, () => NOW).complete, true);
  assert.equal(piqCompleteness({ ...GOOD_PIQ, phone: '12345' }, () => NOW).complete, false);
  assert.equal(piqCompleteness({ ...GOOD_PIQ, whyJoin: 'too short' }, () => NOW).complete, false);
  assert.equal(piqCompleteness({ ...GOOD_PIQ, previousAttempts: '2' }, () => NOW).complete, false, 'details required after earlier attempts');
  assert.equal(piqCompleteness({ ...GOOD_PIQ, previousAttempts: '2', previousAttemptDetails: 'Allahabad 2025' }, () => NOW).complete, true);
  assert.equal(piqCompleteness({ ...GOOD_PIQ, piqComplete: true, fullName: '' }, () => NOW).complete, false, 'client flag is ignored');
  assert.equal(piqCompleteness(null).complete, false);
});

test('create_order refuses an incomplete PIQ and never calls Razorpay', async () => {
  piqStore.clerk_1 = { ...GOOD_PIQ, piqComplete: true, hobbies: '' }; // client claims complete, data says no
  await rejects(() => payments.createOrder({ userId: 'clerk_1' }), 'PIQ_INCOMPLETE');
  piqStore.clerk_1 = null;
  await rejects(() => payments.createOrder({ userId: 'clerk_1' }), 'PIQ_INCOMPLETE');
  assert.equal(razorCalls.length, 0);
});

test('create_order uses the server price and reuses an open order', async () => {
  const a = await payments.createOrder({ userId: 'clerk_1', email: 'a@x.com' });
  assert.equal(a.amountPaise, 29900);
  assert.equal(razorCalls[0][2].amount, 29900);
  const b = await payments.createOrder({ userId: 'clerk_1' });
  assert.equal(b.orderId, a.orderId, 'retry after cancel reuses the order');
  assert.equal(razorCalls.filter((c) => c[1] === '/orders').length, 1);
});

test('double click: concurrent create_order calls make one order', async () => {
  const [a, b] = await Promise.all([payments.createOrder({ userId: 'clerk_1' }), payments.createOrder({ userId: 'clerk_1' })]);
  assert.equal(a.orderId, b.orderId);
  assert.equal(razorCalls.filter((c) => c[1] === '/orders').length, 1);
});

test('rate limit stops order spam', async () => {
  process.env.PAYMENT_ORDER_LIMIT = '2';
  try {
    await payments.createOrder({ userId: 'clerk_1' });
    await payments.createOrder({ userId: 'clerk_1' });
    await rejects(() => payments.createOrder({ userId: 'clerk_1' }), 'RATE_LIMITED');
  } finally { delete process.env.PAYMENT_ORDER_LIMIT; }
});

test('checkout signature verification', () => {
  const s = sig('order_A', 'pay_B');
  assert.equal(payments.verifyCheckoutSignature('order_A', 'pay_B', s), true);
  assert.equal(payments.verifyCheckoutSignature('order_A', 'pay_C', s), false);
  assert.equal(payments.verifyCheckoutSignature('order_A', 'pay_B', 'abc'), false);
  assert.equal(payments.verifyCheckoutSignature('order_A', 'pay_B', undefined), false);
});

test('verify: bad signature is rejected and grants nothing', async () => {
  const o = await payments.createOrder({ userId: 'clerk_1' });
  await rejects(() => payments.verifyPayment({ userId: 'clerk_1', orderId: o.orderId, paymentId: 'pay_ABCDEF1', signature: 'deadbeef' }), 'BAD_SIGNATURE');
  assert.equal(await premium.isPremium('clerk_1'), false);
});

test('verify: grants premium, is idempotent, and sends one receipt', async () => {
  const o = await payments.createOrder({ userId: 'clerk_1', email: 'a@x.com' });
  const args = { userId: 'clerk_1', orderId: o.orderId, paymentId: 'pay_ABCDEF1', signature: sig(o.orderId, 'pay_ABCDEF1') };
  assert.equal((await payments.verifyPayment(args)).status, 'paid');
  assert.equal(await premium.isPremium('clerk_1'), true);
  const again = await payments.verifyPayment(args);
  assert.equal(again.alreadyProcessed, true);
  await new Promise((r) => setImmediate(r));
  assert.equal(receipts.length, 1);
  assert.equal(fake.tables.premium_members.length, 1);
  const row = fake.tables.payment_transactions[0];
  assert.equal(row.status, 'paid'); assert.match(row.receipt_no, /^RK-/);
});

test('verify: another user cannot claim someone else\'s order', async () => {
  const o = await payments.createOrder({ userId: 'clerk_1' });
  await rejects(() => payments.verifyPayment({ userId: 'clerk_2', orderId: o.orderId, paymentId: 'pay_ABCDEF1', signature: sig(o.orderId, 'pay_ABCDEF1') }), 'UNKNOWN_ORDER');
});

test('verify: a wrong amount from Razorpay is refused', async () => {
  const o = await payments.createOrder({ userId: 'clerk_1' });
  const orig = payments.deps.razorpay.call;
  payments.deps.razorpay.call = async (m, p, b) => (m === 'GET' ? { order_id: o.orderId, amount: 100, currency: 'INR', status: 'captured' } : orig(m, p, b));
  await rejects(() => payments.verifyPayment({ userId: 'clerk_1', orderId: o.orderId, paymentId: 'pay_ABCDEF1', signature: sig(o.orderId, 'pay_ABCDEF1') }), 'MISMATCH');
  assert.equal(await premium.isPremium('clerk_1'), false);
});

test('verify: not-yet-captured payment stays pending until the webhook', async () => {
  const o = await payments.createOrder({ userId: 'clerk_1' });
  payStatus = 'created';
  const r = await payments.verifyPayment({ userId: 'clerk_1', orderId: o.orderId, paymentId: 'pay_ABCDEF1', signature: sig(o.orderId, 'pay_ABCDEF1') });
  assert.equal(r.status, 'pending');
  assert.equal(await premium.isPremium('clerk_1'), false);
  await payments.handleWebhook(hook('payment.captured', capturedPayload(o.orderId, 'pay_ABCDEF1'), 'evt_1'));
  assert.equal(await premium.isPremium('clerk_1'), true);
});

test('webhook: rejects a bad signature and an unconfigured secret', async () => {
  const h = hook('payment.captured', capturedPayload('order_X', 'pay_X'), 'evt_1');
  await rejects(() => payments.handleWebhook({ ...h, signature: '00' }), 'BAD_SIGNATURE');
  const saved = process.env.RAZORPAY_WEBHOOK_SECRET; delete process.env.RAZORPAY_WEBHOOK_SECRET;
  try { await rejects(() => payments.handleWebhook(h), 'WEBHOOK_UNCONFIGURED'); } finally { process.env.RAZORPAY_WEBHOOK_SECRET = saved; }
});

test('webhook after redirect and replay: grants once, replay is a no-op', async () => {
  const o = await payments.createOrder({ userId: 'clerk_1' });
  await payments.verifyPayment({ userId: 'clerk_1', orderId: o.orderId, paymentId: 'pay_ABCDEF1', signature: sig(o.orderId, 'pay_ABCDEF1') });
  const h = hook('payment.captured', capturedPayload(o.orderId, 'pay_ABCDEF1'), 'evt_9');
  const first = await payments.handleWebhook(h);
  assert.equal(first.outcome, 'activated');
  const second = await payments.handleWebhook(h);
  assert.equal(second.replay, true);
  assert.equal(fake.tables.premium_members.length, 1);
  assert.equal(fake.tables.payment_transactions.filter((r) => r.status === 'paid').length, 1);
  await new Promise((r) => setImmediate(r));
  assert.equal(receipts.length, 1, 'one receipt even though two paths confirmed');
});

test('webhook first, redirect second: still one grant', async () => {
  const o = await payments.createOrder({ userId: 'clerk_1' });
  await payments.handleWebhook(hook('order.paid', capturedPayload(o.orderId, 'pay_ABCDEF1'), 'evt_2'));
  const r = await payments.verifyPayment({ userId: 'clerk_1', orderId: o.orderId, paymentId: 'pay_ABCDEF1', signature: sig(o.orderId, 'pay_ABCDEF1') });
  assert.equal(r.alreadyProcessed, true);
  assert.equal(fake.tables.premium_members.length, 1);
});

test('webhook with a tampered amount does not grant', async () => {
  const o = await payments.createOrder({ userId: 'clerk_1' });
  const r = await payments.handleWebhook(hook('payment.captured', capturedPayload(o.orderId, 'pay_ABCDEF1', 100), 'evt_3'));
  assert.equal(r.outcome, 'amount_mismatch');
  assert.equal(await premium.isPremium('clerk_1'), false);
});

test('same payment id cannot activate a second order', async () => {
  const o1 = await payments.createOrder({ userId: 'clerk_1' });
  await payments.activate({ orderId: o1.orderId, paymentId: 'pay_ABCDEF1', via: 'webhook' });
  fake.tables.payment_transactions.push({ order_id: 'order_OTHER1234', txnid: 'order_OTHER1234', user_id: 'clerk_1', status: 'created', amount: 299, amount_paise: 29900 });
  await rejects(() => payments.activate({ orderId: 'order_OTHER1234', paymentId: 'pay_ABCDEF1', via: 'webhook' }), 'DUPLICATE_PAYMENT');
});

test('payment.failed marks the order failed, a later success still works, and failure never downgrades', async () => {
  const o = await payments.createOrder({ userId: 'clerk_1' });
  await payments.handleWebhook(hook('payment.failed', { payment: { entity: { id: 'pay_F1ABCD', order_id: o.orderId, error_description: 'Bank declined' } } }, 'evt_f'));
  assert.equal(fake.tables.payment_transactions[0].status, 'failed');
  await payments.handleWebhook(hook('payment.captured', capturedPayload(o.orderId, 'pay_OKABCD'), 'evt_ok'));
  assert.equal(await premium.isPremium('clerk_1'), true);
  await payments.handleWebhook(hook('payment.failed', { payment: { entity: { id: 'pay_F2ABCD', order_id: o.orderId } } }, 'evt_f2'));
  assert.equal(fake.tables.payment_transactions[0].status, 'paid');
  assert.equal(await premium.isPremium('clerk_1'), true);
});

test('full refund revokes premium; partial refund does not', async () => {
  const o = await payments.createOrder({ userId: 'clerk_1' });
  await payments.activate({ orderId: o.orderId, paymentId: 'pay_ABCDEF1', via: 'verify' });
  await payments.handleWebhook(hook('refund.processed', { refund: { entity: { id: 'rfnd_1', payment_id: 'pay_ABCDEF1', amount: 5000 } } }, 'evt_r1'));
  assert.equal(await premium.isPremium('clerk_1'), true);
  await payments.handleWebhook(hook('refund.processed', { refund: { entity: { id: 'rfnd_2', payment_id: 'pay_ABCDEF1', amount: 29900 } } }, 'evt_r2'));
  premium.invalidate();
  assert.equal(await premium.isPremium('clerk_1'), false);
  assert.equal(fake.tables.payment_transactions[0].status, 'refunded');
  await rejects(() => payments.activate({ orderId: o.orderId, paymentId: 'pay_ABCDEF1', via: 'webhook' }), 'REFUNDED');
});

test('every transition is logged', async () => {
  const o = await payments.createOrder({ userId: 'clerk_1' });
  await payments.activate({ orderId: o.orderId, paymentId: 'pay_ABCDEF1', via: 'verify' });
  const kinds = fake.tables.payment_events.map((e) => e.kind);
  assert.deepEqual(kinds, ['order_created', 'activate:verify', 'entitlement_granted']);
});

test('GST breakup is inclusive and sums to the total', () => {
  assert.deepEqual(payments.gstBreakup(29900, 0), { base_amount_paise: 29900, gst_rate_percent: 0, gst_amount_paise: 0 });
  const g = payments.gstBreakup(29900, 18);
  assert.equal(g.base_amount_paise + g.gst_amount_paise, 29900);
  assert.equal(g.base_amount_paise, 25339);
});

test('billing history lists only real attempts', async () => {
  const o = await payments.createOrder({ userId: 'clerk_1', email: 'a@x.com' });
  assert.equal((await payments.listPayments('clerk_1')).length, 0, 'unpaid orders are hidden');
  await payments.activate({ orderId: o.orderId, paymentId: 'pay_ABCDEF1', via: 'verify' });
  const [item] = await payments.listPayments('clerk_1');
  assert.equal(item.status, 'paid'); assert.equal(item.amountInr, 299); assert.match(item.receiptNo, /^RK-/);
});

// ---------------------------------------------------------------- identity + entitlements

test('entitlement: expired, inactive and missing rows are free; errors fail closed', async () => {
  fake.tables.premium_members.push({ user_id: 'u_exp', subscription_status: 'active', premium_expires_at: '2020-01-01T00:00:00Z' });
  fake.tables.premium_members.push({ user_id: 'u_off', subscription_status: 'cancelled' });
  fake.tables.premium_members.push({ user_id: 'u_ok', subscription_status: 'active', plan_type: 'lifetime', premium_since: '2026-01-01T00:00:00Z' });
  assert.equal(await premium.isPremium('u_exp'), false);
  assert.equal(await premium.isPremium('u_off'), false);
  assert.equal(await premium.isPremium('nobody'), false);
  assert.equal(await premium.isPremium(''), false);
  const e = await premium.getEntitlement('u_ok');
  assert.deepEqual([e.premium, e.plan, e.premiumSince], [true, 'lifetime', '2026-01-01T00:00:00Z']);
});

test('HTTP: webhook reads the raw body; routes require auth', async () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://stub.invalid';
  process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'stub';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'stub';
  const { createApp } = require('../app');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const h = hook('payment.captured', capturedPayload('order_NOPE1234', 'pay_NOPE1234'), 'evt_http');
    const bad = await fetch(`${base}/api/payments/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-razorpay-signature': '00' }, body: h.rawBody });
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error.code, 'BAD_SIGNATURE');
    const ok = await fetch(`${base}/api/payments/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-razorpay-signature': h.signature, 'x-razorpay-event-id': 'evt_http' }, body: h.rawBody });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).outcome, 'unknown_order');
    assert.equal((await fetch(`${base}/api/me`)).status, 401);
    assert.equal((await fetch(`${base}/api/payments/order`, { method: 'POST' })).status, 401);
  } finally { server.close(); }
});
