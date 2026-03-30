const express = require('express');
const router = express.Router();
const therapistProtect = require('../middleware/therapistAuth');
const {
    getDashboard,
    updateAvailability,
    acceptSession,
    cancelSession
} = require('../controllers/therapistDashController');

router.get('/dashboard', therapistProtect, getDashboard);
router.put('/availability', therapistProtect, updateAvailability);
router.put('/session/:id/accept', therapistProtect, acceptSession);
router.put('/session/:id/cancel', therapistProtect, cancelSession);

module.exports = router;