const express = require('express');
const { guard, AI } = require('../middleware/guard');
const schemas = require('../middleware/schemas');
const { asyncHandler } = require('../middleware/asyncHandler');
const { pickImages } = require('../services/storyImages');

const router = express.Router({ caseSensitive: true });

/**
 * GET /api/images?test=ppdt|tat&count=1..12
 * Random pictures from the storage bucket. Free accounts draw only from the first few.
 */
router.get(
  '/',
  ...guard({ limits: ['write'] }),
  asyncHandler(async (req, res) => {
    const test = req.query.test === 'tat' ? 'tat' : 'ppdt';
    const count = Math.max(1, Math.min(12, Number.parseInt(req.query.count, 10) || 1));
    const result = await pickImages({ test, count, userId: req.authUser.uid });
    if (result.data.length === 0) {
      const err = new Error('No pictures are available yet');
      err.statusCode = 503;
      throw err;
    }
    res.json({ success: true, ...result });
  })
);

module.exports = router;
