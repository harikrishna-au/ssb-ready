const express = require('express');
const { firebaseProtect } = require('../middleware/firebaseAuthMiddleware');
const {
  evaluatePpdtHandler,
  evaluateWatHandler,
  evaluateSrtHandler,
  evaluateTatHandler
} = require('../controllers/evaluationController');

const router = express.Router();

router.post('/ppdt', firebaseProtect, evaluatePpdtHandler);
router.post('/wat', firebaseProtect, evaluateWatHandler);
router.post('/srt', firebaseProtect, evaluateSrtHandler);
router.post('/tat', firebaseProtect, evaluateTatHandler);

module.exports = router;
