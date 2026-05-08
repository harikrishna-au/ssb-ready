const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getInterviewQuestions } = require('../controllers/testController');

const router = express.Router();

router.get('/prep', protect, getInterviewQuestions);

module.exports = router;
