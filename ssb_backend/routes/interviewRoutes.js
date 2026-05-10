const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getInterviewQuestions } = require('../controllers/testController');
const { interviewReplyHandler } = require('../controllers/evaluationController');

const router = express.Router();

router.post('/reply', interviewReplyHandler);
router.get('/prep', protect, getInterviewQuestions);

module.exports = router;
