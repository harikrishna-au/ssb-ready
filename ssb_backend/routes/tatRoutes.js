const express = require('express');
const { firebaseProtect } = require('../middleware/firebaseAuthMiddleware');
const { runTatPipeline } = require('../controllers/tatController');

const router = express.Router();

router.post('/pipeline', firebaseProtect, runTatPipeline);

module.exports = router;
