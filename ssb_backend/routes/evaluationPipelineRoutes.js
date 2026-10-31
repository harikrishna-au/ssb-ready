const express = require('express');
const { guard, AI } = require('../middleware/guard');
const schemas = require('../middleware/schemas');
const { runEvaluationHandler } = require('../controllers/evaluationPipelineController');

const router = express.Router({ caseSensitive: true });

router.post('/run', ...guard({ schema: schemas.pipelineRun, limits: AI }), runEvaluationHandler);

module.exports = router;
