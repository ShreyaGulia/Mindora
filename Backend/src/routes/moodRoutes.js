const express = require('express');
const router  = express.Router();

const {
  logMood,
  getMoodHistory,
  getTodayMood
} = require('../controllers/moodController');

const { protect } = require('../middleware/authMiddleware');

// All mood routes are protected
router.post('/',         protect, logMood);        // POST /api/mood
router.get('/history',   protect, getMoodHistory); // GET  /api/mood/history
router.get('/today',     protect, getTodayMood);   // GET  /api/mood/today

module.exports = router;