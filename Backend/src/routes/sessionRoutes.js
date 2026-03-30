const express = require('express');
const router  = express.Router();

const {
  bookSession,
  getMySessions,
  cancelSession
} = require('../controllers/sessionController');

const { protect } = require('../middleware/authMiddleware');

// All session routes are protected — must be logged in
router.post('/book',        protect, bookSession);      // POST /api/sessions/book
router.get('/my',           protect, getMySessions);    // GET  /api/sessions/my
router.put('/:id/cancel',   protect, cancelSession);    // PUT  /api/sessions/:id/cancel

module.exports = router;