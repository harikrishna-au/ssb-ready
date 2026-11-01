const express = require('express');
const { guard } = require('../middleware/guard');
const { asyncHandler } = require('../middleware/asyncHandler');
const { getEntitlement } = require('../services/premium');
const { piqCompleteness } = require('../services/paymentsPiq');
const payments = require('../services/payments');
const { logger } = require('../utils/logger');

const router = express.Router();

/** GET /api/me -> the one trustworthy answer to "is this user premium?" */
router.get(
  '/',
  ...guard({ limits: ['write'] }),
  asyncHandler(async (req, res) => {
    const userId = req.authUser.uid;
    const [ent, piq] = await Promise.all([
      getEntitlement(userId),
      payments.deps.getPiq(userId).catch((e) => { logger.warn(`/api/me PIQ read failed: ${e.message}`); return null; })
    ]);
    res.json({
      userId,
      premium: ent.premium,
      plan: ent.plan,
      premiumSince: ent.premiumSince,
      piqComplete: piqCompleteness(piq).complete
    });
  })
);

module.exports = router;
