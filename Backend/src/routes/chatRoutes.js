const express = require('express');
const router  = express.Router();

const {
  saveChat,
  getChatHistory,
  getChatById
} = require('../controllers/chatController');

const { protect } = require('../middleware/authMiddleware');

// All chat routes are protected
router.post('/save',      protect, saveChat);        // POST /api/chat/save
router.get('/history',    protect, getChatHistory);  // GET  /api/chat/history
router.get('/history/:id',protect, getChatById);     // GET  /api/chat/history/:id

module.exports = router;