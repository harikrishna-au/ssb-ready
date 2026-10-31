/** Email receipt via Resend. Off unless RECEIPT_EMAILS_ENABLED=true and the Resend settings exist. */
const { logger } = require('../utils/logger');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function buildReceipt(row) {
  const rupees = (paise) => `Rs ${(paise / 100).toFixed(2)}`;
  const lines = [
    ['Receipt number', row.receipt_no],
    ['Payment id', row.payment_id],
    ['Order id', row.order_id],
    ['Date', row.paid_at],
    ['Plan', 'ReadyKadet Lifetime access (one-time)']
  ];
  if (row.gst_amount_paise > 0) {
    lines.push(['Amount before GST', rupees(row.base_amount_paise)], [`GST at ${row.gst_rate_percent}%`, rupees(row.gst_amount_paise)]);
    if (process.env.BUSINESS_GSTIN) lines.push(['GSTIN', process.env.BUSINESS_GSTIN]);
  }
  lines.push(['Total paid', rupees(row.amount_paise)]);
  const html = `<h2>Your ReadyKadet receipt</h2><table cellpadding="6">${lines.map(([k, v]) => `<tr><td>${esc(k)}</td><td><strong>${esc(v)}</strong></td></tr>`).join('')}</table><p>Questions? Reply to this email.</p>`;
  const text = lines.map(([k, v]) => `${k}: ${v}`).join('\n');
  return { subject: `ReadyKadet receipt ${row.receipt_no}`, html, text };
}

/** Returns true when an email was handed to the provider, false when skipped. Throws on provider errors. */
async function sendReceiptEmail(row) {
  if (process.env.RECEIPT_EMAILS_ENABLED !== 'true') return false;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RECEIPT_FROM_EMAIL;
  if (!key || !from || !row.email) {
    logger.warn('Receipt email enabled but RESEND_API_KEY, RECEIPT_FROM_EMAIL or the buyer email is missing');
    return false;
  }
  const { subject, html, text } = buildReceipt(row);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [row.email], subject, html, text })
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}`);
  return true;
}

module.exports = { sendReceiptEmail, buildReceipt };
