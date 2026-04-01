const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requirePro } = require('../middleware/checkPlan');
const {
  bookSession,
  getMySessions,
  cancelSession
} = require('../controllers/sessionController');

// All session routes are protected — must be logged in
router.post('/book', protect, requirePro, bookSession);
router.get('/my', protect, getMySessions);
router.put('/:id/cancel', protect, cancelSession);    // PUT  /api/sessions/:id/cancel

module.exports = router;