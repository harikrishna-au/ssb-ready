const express = require('express');
const { firebaseProtect } = require('../middleware/firebaseAuthMiddleware');
const { asyncHandler } = require('../middleware/asyncHandler');
const { getEntitlement } = require('../services/premium');
const { linkByVerifiedEmail } = require('../services/identity');
const { piqCompleteness } = require('../services/paymentsPiq');
const payments = require('../services/payments');
const { logger } = require('../utils/logger');

const router = express.Router();
router.use(firebaseProtect);

/** GET /api/me -> the one trustworthy answer to "is this user premium?" */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.firebaseUser.uid;
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

/** POST /api/me/link-identity -> links this login to the other one that has the same verified email. */
router.post(
  '/link-identity',
  asyncHandler(async (req, res) => {
    const result = await linkByVerifiedEmail(req.firebaseUser.uid);
    const ent = await getEntitlement(req.firebaseUser.uid, { fresh: true });
    res.json({ linked: result.linked, reason: result.reason || null, premium: ent.premium });
  })
);

module.exports = router;
