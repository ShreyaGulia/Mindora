const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/therapistDashController');
const therapistAuth = require('../middleware/therapistAuth');

router.use(therapistAuth);

router.get('/overview', ctrl.getOverview);
router.get('/sessions', ctrl.getSessions);
router.patch('/sessions/:sessionId/confirm', ctrl.confirmSession);
router.get('/earnings', ctrl.getEarnings);

module.exports = router;