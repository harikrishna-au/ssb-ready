const express = require('express');
const {
  evaluatePpdtHandler,
  evaluateWatHandler,
  evaluateSrtHandler,
  evaluateTatHandler
} = require('../controllers/evaluationController');

const router = express.Router();

router.post('/ppdt', evaluatePpdtHandler);
router.post('/wat', evaluateWatHandler);
router.post('/srt', evaluateSrtHandler);
router.post('/tat', evaluateTatHandler);

module.exports = router;
