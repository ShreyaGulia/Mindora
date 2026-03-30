const express = require('express');
const router = express.Router();
const adminProtect = require('../middleware/adminAuth');
const {
    login, getStats, getPendingTherapists,
    verifyTherapist, removeTherapist,
    getAllUsers, getAllSessions
} = require('../controllers/adminController');

router.post('/login', login);
router.get('/stats', adminProtect, getStats);
router.get('/therapists/pending', adminProtect, getPendingTherapists);
router.put('/therapists/:id/verify', adminProtect, verifyTherapist);
router.delete('/therapists/:id', adminProtect, removeTherapist);
router.get('/users', adminProtect, getAllUsers);
router.get('/sessions', adminProtect, getAllSessions);

module.exports = router;