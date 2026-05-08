const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  saveOirResult,
  getOirHistory,
  saveStoryTest,
  saveResponseTest
} = require('../controllers/testController');

const router = express.Router();

router.post('/oir', protect, saveOirResult);
router.get('/oir/history', protect, getOirHistory);
router.post('/tests/story', protect, saveStoryTest);
router.post('/tests/responses', protect, saveResponseTest);

module.exports = router;
