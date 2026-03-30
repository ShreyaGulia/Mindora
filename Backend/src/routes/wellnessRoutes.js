const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { assess } = require('../controllers/wellnessController');

// Protected — user must be logged in
router.post('/assess', protect, assess);

module.exports = router;