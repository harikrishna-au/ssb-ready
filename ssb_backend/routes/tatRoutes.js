const express = require('express');
const { guard, AI } = require('../middleware/guard');
const schemas = require('../middleware/schemas');
const { runTatPipeline } = require('../controllers/tatController');

const router = express.Router({ caseSensitive: true });

router.post('/pipeline', ...guard({ schema: schemas.tatPipeline, limits: AI }), runTatPipeline);

module.exports = router;
