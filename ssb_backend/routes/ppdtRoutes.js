const express = require('express');
const { guard, AI } = require('../middleware/guard');
const schemas = require('../middleware/schemas');
const { runPpdtPipeline, extractWrittenPaperText } = require('../controllers/ppdtController');

const router = express.Router({ caseSensitive: true });

router.post('/ocr', ...guard({ schema: schemas.ocr, limits: AI }), extractWrittenPaperText);
router.post('/pipeline', ...guard({ schema: schemas.ppdtPipeline, limits: AI }), runPpdtPipeline);

module.exports = router;
