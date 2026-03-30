const express = require('express');
const router  = express.Router();

const {
  getAllTherapists,
  getTherapistById
} = require('../controllers/therapistController');

// Public routes — no login needed to browse therapists
router.get('/',    getAllTherapists);   // GET /api/therapists
router.get('/:id', getTherapistById);  // GET /api/therapists/:id

module.exports = router;