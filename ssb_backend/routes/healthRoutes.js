const express = require('express');
const { asyncHandler } = require('../middleware/asyncHandler');
const { runHealthChecks } = require('../services/healthChecks');

const router = express.Router({ caseSensitive: true });

// Liveness: cheap, used by Render's health check. Does not touch any dependency.
router.get('/', (_req, res) => {
  res.json({ success: true, status: 'ok' });
});

// Dependency check: the database, Supabase storage and OpenAI. Returns only ok/fail per dependency, never error text.
// 200 when everything is reachable, 503 otherwise. Point an uptime monitor at this path.
const ready = asyncHandler(async (_req, res) => {
  const { ok, checks } = await runHealthChecks();
  res.status(ok ? 200 : 503).json({ success: ok, status: ok ? 'ready' : 'degraded', checks });
});
router.get('/ready', ready);
router.get('/readiness', ready); // older name, kept for existing monitors

module.exports = router;
