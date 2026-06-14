const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sessionController');
const { protect } = require('../middleware/authMiddleware');
const therapistAuth = require('../middleware/therapistAuth');

// ── PUBLIC ────────────────────────────────────────────────
router.get('/slots/:therapistId', ctrl.getSlots);

// ── USER AUTH ─────────────────────────────────────────────
router.post('/book', protect, ctrl.bookSession);
router.post('/confirm-payment', protect, ctrl.confirmPayment);
router.post('/:id/cancel', protect, ctrl.cancelSession);
router.post('/:id/review', protect, ctrl.submitReview);
router.get('/my', protect, ctrl.getUserSessions);

// ── THERAPIST AUTH ────────────────────────────────────────
router.post('/:id/complete', therapistAuth, ctrl.completeSession);
router.post('/:id/set-room', therapistAuth, ctrl.setRoomUrl);   // therapist sets Meet link
router.get('/:id/room', protect, ctrl.getRoomUrl);  // client gets Meet link
router.get('/my-therapist-session/:id', therapistAuth, ctrl.getTherapistSessionRoom); // therapist gets their session room
router.post('/:id/notes', therapistAuth, ctrl.saveNotes);
router.get('/:id/notes', therapistAuth, ctrl.getNotes);

module.exports = router;