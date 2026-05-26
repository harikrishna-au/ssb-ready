const express = require('express');
const { config } = require('../config');
const { buildPrivacyPolicyHtml } = require('../legal/privacyPolicyHtml');

const router = express.Router();

const EFFECTIVE_DATE = '26 May 2026';

function legalMeta(req) {
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host') || '';
  const inferred =
    host && !host.includes('localhost')
      ? `${proto}://${host}`.replace(/\/+$/, '')
      : '';
  return {
    supportEmail: process.env.SUPPORT_EMAIL || 'support@ssbready.app',
    publicUrl: config.publicUrl || inferred,
    effectiveDate: EFFECTIVE_DATE
  };
}

router.get('/privacy', (req, res) => {
  res.type('html').send(buildPrivacyPolicyHtml(legalMeta(req)));
});

router.get('/privacy-policy', (_req, res) => {
  res.redirect(301, '/privacy');
});

module.exports = router;
