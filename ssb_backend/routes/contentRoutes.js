const express = require('express');
const { firebaseProtect } = require('../middleware/firebaseAuthMiddleware');
const { asyncHandler } = require('../middleware/asyncHandler');
const { getRandomSet, checkOirAnswer } = require('../services/contentBank');

const router = express.Router();
router.use(firebaseProtect);

/** POST /api/content/oir/check  { setId, questionId, index } -> { correct, correctIndex, explanation } */
router.post(
  '/oir/check',
  asyncHandler(async (req, res) => {
    res.json({ success: true, ...(await checkOirAnswer({ ...(req.body || {}), userId: req.firebaseUser.uid })) });
  })
);

/** GET /api/content/:bank?count=N  (bank: wat | srt | lecturette | oir). No answers are included. */
router.get(
  '/:bank',
  asyncHandler(async (req, res) => {
    const tags = typeof req.query.tags === 'string' ? req.query.tags.split(',').filter(Boolean) : undefined;
    const out = await getRandomSet({ bank: req.params.bank, count: req.query.count, userId: req.firebaseUser.uid, tags });
    res.json({ success: true, ...out });
  })
);

module.exports = router;
