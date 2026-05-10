const express = require('express');
const { firebaseProtect } = require('../middleware/firebaseAuthMiddleware');
const { runEvaluationHandler } = require('../controllers/evaluationPipelineController');

const router = express.Router();

router.post('/run', firebaseProtect, runEvaluationHandler);

module.exports = router;
