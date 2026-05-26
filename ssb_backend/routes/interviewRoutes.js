const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getInterviewQuestions, getInterviewQuestionBankHandler } = require('../controllers/testController');
const { interviewReplyHandler } = require('../controllers/evaluationController');

const router = express.Router();

router.post('/reply', interviewReplyHandler);
router.get('/prep', protect, getInterviewQuestions);
router.get('/bank', protect, getInterviewQuestionBankHandler);

module.exports = router;
