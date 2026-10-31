const express = require('express');
const { guard, AI } = require('../middleware/guard');
const schemas = require('../middleware/schemas');
const {
  evaluatePpdtHandler,
  evaluateWatHandler,
  evaluateSrtHandler,
  evaluateTatHandler
} = require('../controllers/evaluationController');

const router = express.Router({ caseSensitive: true });

router.post('/ppdt', ...guard({ schema: schemas.evalPpdt, limits: AI }), evaluatePpdtHandler);
router.post('/wat', ...guard({ schema: schemas.evalResponses, limits: AI }), evaluateWatHandler);
router.post('/srt', ...guard({ schema: schemas.evalResponses, limits: AI }), evaluateSrtHandler);
router.post('/tat', ...guard({ schema: schemas.evalTat, limits: AI }), evaluateTatHandler);

module.exports = router;
