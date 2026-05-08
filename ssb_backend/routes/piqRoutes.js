const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { savePiq, getPiq } = require('../controllers/testController');

const router = express.Router();

router.post('/', protect, savePiq);
router.get('/', protect, getPiq);

module.exports = router;
