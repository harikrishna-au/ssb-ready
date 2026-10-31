const { asyncHandler } = require('../middleware/asyncHandler');
const { exportUserData, deleteUserData } = require('../services/accountData');
const { logger } = require('../utils/logger');

const exportAccount = asyncHandler(async (req, res) => {
  const data = await exportUserData(req.firebaseUser);
  res.setHeader('Content-Disposition', 'attachment; filename="readykadet-my-data.json"');
  res.setHeader('Cache-Control', 'no-store');
  res.json(data);
});

const deleteAccount = asyncHandler(async (req, res) => {
  const result = await deleteUserData(req.firebaseUser);
  logger.info('account deletion finished', { requestId: req.requestId, ok: result.ok, failedSteps: result.failed });
  if (!result.ok) {
    // Sent directly (not via the error handler) so the message survives in production.
    return res.status(502).json({
      success: false,
      error: { message: 'We could not delete everything yet. Please try again.', requestId: req.requestId }
    });
  }
  res.json({ success: true });
});

module.exports = { exportAccount, deleteAccount };
