const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { loginProxy, signupProxy, getUserProfile } = require('../controllers/userController');

const router = express.Router();

router.post('/signup', signupProxy);
router.post('/login', loginProxy);
router.get('/profile', protect, getUserProfile);

module.exports = router;
