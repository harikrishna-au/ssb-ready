const express = require('express');
const { guard } = require('../middleware/guard');
const schemas = require('../middleware/schemas');
const { asyncHandler } = require('../middleware/asyncHandler');
const payments = require('../services/payments');
const { getEntitlement } = require('../services/premium');

/** Authenticated routes, mounted at /api/payments. */
const router = express.Router();

// POST /api/payments/order  (body is ignored: the amount and plan are fixed on the server)
router.post('/order', ...guard({ limits: ['write'] }), asyncHandler(async (req, res) => {
  const out = await payments.createOrder({ userId: req.authUser.uid, email: req.authUser.email || '' });
  res.json({ success: true, ...out });
}));

// POST /api/payments/verify  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
router.post('/verify', ...guard({ schema: schemas.paymentVerify, limits: ['write'] }), asyncHandler(async (req, res) => {
  const b = req.body || {};
  const out = await payments.verifyPayment({
    userId: req.authUser.uid, orderId: b.razorpay_order_id, paymentId: b.razorpay_payment_id, signature: b.razorpay_signature
  });
  res.status(out.status === 'paid' ? 200 : 202).json({ success: true, ...out });
}));

// GET /api/payments/order/:orderId  (poll after a redirect, in case the webhook finished first)
router.get('/order/:orderId', ...guard({ limits: ['write'] }), asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await payments.orderStatus({ userId: req.authUser.uid, orderId: req.params.orderId })) });
}));

// GET /api/payments/history  -> payment history and receipt details for /billing
router.get('/history', ...guard({ limits: ['write'] }), asyncHandler(async (req, res) => {
  const [items, ent] = await Promise.all([payments.listPayments(req.authUser.uid), getEntitlement(req.authUser.uid)]);
  res.json({ success: true, premium: ent.premium, items });
}));

// Keep machine-readable codes (PIQ_INCOMPLETE, RATE_LIMITED, ...) that the global handler drops.
router.use((err, req, res, next) => {
  if (!err.expose) return next(err);
  res.status(err.statusCode || 400).json({ success: false, error: { message: err.message, code: err.code, requestId: req.requestId } });
});

/**
 * Razorpay webhook, mounted at /api/payments/webhook BEFORE express.json so the signature is
 * checked against the exact bytes Razorpay sent.
 */
const webhook = express.Router();
webhook.post('/', express.raw({ type: '*/*', limit: '1mb' }), asyncHandler(async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  const out = await payments.handleWebhook({
    rawBody, signature: req.get('x-razorpay-signature') || '', eventId: req.get('x-razorpay-event-id') || ''
  });
  res.json({ success: true, ...out });
}));
webhook.use((err, req, res, next) => {
  if (!err.expose) return next(err);
  res.status(err.statusCode || 400).json({ success: false, error: { message: err.message, code: err.code } });
});

module.exports = router;
module.exports.webhook = webhook;
