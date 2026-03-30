const express = require('express');
const router  = express.Router();

const { getProfile, updateProfile } = require('../controllers/userController');
const { protect }                   = require('../middleware/authMiddleware');

// Both routes are protected — user must be logged in
router.get('/',  protect, getProfile);    // GET /api/user/profile
router.put('/',  protect, updateProfile); // PUT /api/user/profile

module.exports = router;