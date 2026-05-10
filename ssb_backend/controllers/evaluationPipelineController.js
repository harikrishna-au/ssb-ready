const { asyncHandler } = require('../middleware/asyncHandler');
const { runEvaluationPipeline } = require('../services/evaluationOrchestrator');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

/**
 * POST /api/evaluation/run
 * Auth: Firebase ID token (Authorization: Bearer …)
 * Body: { testType: 'WAT'|'SRT'|'OIR'|'INTERVIEW_REPLY', payload: object }
 *
 * - WAT/SRT: payload.responses — map of strings
 * - OIR: payload.score, payload.totalQuestions
 * - INTERVIEW_REPLY: payload.piq, payload.chatHistory
 */
const runEvaluationHandler = asyncHandler(async (req, res) => {
  const userId = req.firebaseUser.uid;
  const { testType, payload } = req.body;
  if (!testType || typeof testType !== 'string') {
    throw badRequest('testType is required');
  }
  const normalized = testType.trim().toUpperCase().replace(/-/g, '_');
  const result = await runEvaluationPipeline(userId, normalized, payload && typeof payload === 'object' ? payload : {});
  res.json({ success: true, ...result });
});

module.exports = { runEvaluationHandler };
