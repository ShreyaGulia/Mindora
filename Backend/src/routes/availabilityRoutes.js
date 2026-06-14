const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/availabilityController');
const therapistAuth = require('../middleware/therapistAuth');

// ── Public route (used by clients) ───────────────────────
// GET /api/availability/:therapistId/slots?date=YYYY-MM-DD
router.get('/:therapistId/slots', ctrl.getAvailableSlots);

// ── Therapist-only routes ─────────────────────────────────
router.use(therapistAuth);

router.get('/settings', ctrl.getAvailability);
router.post('/settings', ctrl.saveAvailability);
router.post('/block', ctrl.toggleBlockDate);

module.exports = router;