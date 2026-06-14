const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const therapistAuth = require('../middleware/therapistAuth');

// ── User routes ───────────────────────────────────────────
router.get('/threads', protect, ctrl.getUserThreads);
router.get('/unread-count', protect, ctrl.getUnreadCount);
router.get('/:therapistId', protect, ctrl.getThread);
router.post('/:therapistId', protect, ctrl.sendMessage);

// ── Therapist routes ──────────────────────────────────────
router.get('/therapist-threads', therapistAuth, ctrl.getTherapistThreads);
router.get('/therapist-view/:userId', therapistAuth, ctrl.getThreadAsTherapist);
router.post('/therapist-reply/:userId', therapistAuth, ctrl.therapistReply);

module.exports = router;