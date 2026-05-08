const express = require('express');
const supabase = require('../config/supabase');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ success: true, status: 'ok' });
  })
);

router.get(
  '/readiness',
  asyncHandler(async (_req, res) => {
    const { error } = await supabase.from('piqs').select('user_id').limit(1);
    if (error) {
      return res.status(503).json({
        success: false,
        status: 'degraded',
        reason: 'database_unavailable'
      });
    }
    return res.json({ success: true, status: 'ready' });
  })
);

module.exports = router;
