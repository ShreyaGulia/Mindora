const express = require('express');
const router  = express.Router();

const { aiChat } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// AI chat endpoint
router.post('/chat', protect, aiChat);  // POST /api/ai/chat

module.exports = router;