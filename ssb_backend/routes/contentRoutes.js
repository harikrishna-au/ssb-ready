const express = require('express');
const { guard } = require('../middleware/guard');
const schemas = require('../middleware/schemas');
const { asyncHandler } = require('../middleware/asyncHandler');
const { getRandomSet, checkOirAnswer } = require('../services/contentBank');

const router = express.Router();

/** POST /api/content/oir/check  { setId, questionId, index } -> { correct, correctIndex, explanation } */
router.post(
  '/oir/check',
  ...guard({ schema: schemas.oirCheck, limits: ['write'] }),
  asyncHandler(async (req, res) => {
    res.json({ success: true, ...(await checkOirAnswer({ ...(req.body || {}), userId: req.authUser.uid })) });
  })
);

/** GET /api/content/:bank?count=N  (bank: wat | srt | lecturette | oir). No answers are included. */
router.get(
  '/:bank',
  ...guard({ limits: ['write'] }),
  asyncHandler(async (req, res) => {
    const tags = typeof req.query.tags === 'string' ? req.query.tags.split(',').filter(Boolean) : undefined;
    const out = await getRandomSet({ bank: req.params.bank, count: req.query.count, userId: req.authUser.uid, tags, mode: req.query.mode === 'full' ? 'full' : 'quick' });
    res.json({ success: true, ...out });
  })
);

module.exports = router;
