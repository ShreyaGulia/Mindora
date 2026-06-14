const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { signup, login, getMe, adminLogin } = require('../controllers/authController');

// Public routes — no token needed
router.post('/signup', signup);
router.post('/login', login);
router.post('/admin-login', adminLogin);

// Protected route — token required
router.get('/me', protect, getMe);

module.exports = router;