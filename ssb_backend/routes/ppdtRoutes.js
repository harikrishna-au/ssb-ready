const express = require('express');
const { firebaseProtect } = require('../middleware/firebaseAuthMiddleware');
const { runPpdtPipeline, extractWrittenPaperText } = require('../controllers/ppdtController');

const router = express.Router();

router.post('/ocr', firebaseProtect, extractWrittenPaperText);
router.post('/pipeline', firebaseProtect, runPpdtPipeline);

module.exports = router;
