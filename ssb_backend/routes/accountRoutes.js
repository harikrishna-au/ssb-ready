const express = require('express');
const { firebaseProtect } = require('../middleware/firebaseAuthMiddleware');
const { exportAccount, deleteAccount } = require('../controllers/accountController');

const router = express.Router();

// Body validation and rate limits for these two routes live in middleware/platform.js.
router.get('/export', firebaseProtect, exportAccount);
router.delete('/', firebaseProtect, deleteAccount);

module.exports = router;
