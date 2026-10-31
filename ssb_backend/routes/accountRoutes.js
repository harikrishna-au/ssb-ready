const express = require('express');
const { guard, AI } = require('../middleware/guard');
const schemas = require('../middleware/schemas');
const { exportAccount, deleteAccount } = require('../controllers/accountController');

const router = express.Router({ caseSensitive: true });

router.get('/export', ...guard({ limits: ['account'] }), exportAccount);
router.delete('/', ...guard({ schema: schemas.accountDelete, limits: ['account'] }), deleteAccount);

module.exports = router;
