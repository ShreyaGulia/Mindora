const express          = require('express');
const router           = express.Router();
const { chat }         = require('../controllers/aiChatController');
const { protect }      = require('../middleware/authMiddleware');
const { aiChatLimiter }= require('../middleware/rateLimiter');

// POST /api/ai/chat
// - aiChatLimiter: max 20 AI calls per user per hour
// - protect: attach req.user so chat history can be saved (optional login)
router.post('/chat', aiChatLimiter, protect, chat);

module.exports = router;