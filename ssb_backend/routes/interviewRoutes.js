const express = require('express');
const { firebaseProtect } = require('../middleware/firebaseAuthMiddleware');
const { getInterviewQuestionBankHandler } = require('../controllers/testController');
const { interviewReplyHandler } = require('../controllers/evaluationController');

const router = express.Router();

// /prep requires Supabase PIQ lookup — kept as legacy; unused by current app.
// /reply and /bank use Firebase auth to match the Flutter BackendApiClient.
router.post('/reply', firebaseProtect, interviewReplyHandler);
router.get('/bank', firebaseProtect, getInterviewQuestionBankHandler);

module.exports = router;
