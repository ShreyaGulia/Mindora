const express = require('express');
const router = express.Router();
const therapistController = require('../controllers/therapistController');
const therapistAuth = require('../middleware/therapistAuth');

// Public Search (Users/Clients)
router.get('/', therapistController.getSimpleList);
router.get('/browse', therapistController.browseTherapists);

// Public: fetch single therapist by Therapist document _id (used by book-session.html)
router.get('/:id', therapistController.getTherapistById);

// Everything below requires therapist authentication
router.use(therapistAuth);

// Onboarding
router.post('/onboarding', therapistController.saveOnboarding);
router.get('/onboarding-status', therapistController.getOnboardingStatus);

// Profile
router.get('/profile', therapistController.getProfile);
router.put('/profile', therapistController.updateProfile);
router.patch('/status', therapistController.toggleOnline);

module.exports = router;