const MoodLog = require('../models/MoodLog');

/* ─────────────────────────────────────────
   POST /api/mood
   Save a daily mood entry
   Powers the mood strip and tracker
───────────────────────────────────────── */
exports.logMood = async (req, res) => {
  try {
    const { mood, note } = req.body;

    // Validate mood value
    const validMoods = ['awful', 'low', 'okay', 'good', 'great'];
    if (!mood || !validMoods.includes(mood)) {
      return res.status(400).json({
        success: false,
        message: `Mood must be one of: ${validMoods.join(', ')}.`
      });
    }

    const entry = await MoodLog.create({
      user:  req.user.id,
      mood,
      note:  note || ''
    });

    return res.status(201).json({
      success: true,
      message: 'Mood logged.',
      entry
    });
  } catch (err) {
    console.error('logMood error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ─────────────────────────────────────────
   GET /api/mood/history
   Returns last 30 days of mood entries
   Powers the mood strip and tracker on frontend
───────────────────────────────────────── */
exports.getMoodHistory = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const entries = await MoodLog
      .find({
        user:      req.user.id,
        loggedAt:  { $gte: thirtyDaysAgo }
      })
      .sort({ loggedAt: -1 });   // newest first

    return res.status(200).json({
      success: true,
      count: entries.length,
      entries
    });
  } catch (err) {
    console.error('getMoodHistory error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ─────────────────────────────────────────
   GET /api/mood/today
   Returns today's mood entry (if exists)
───────────────────────────────────────── */
exports.getTodayMood = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const entry = await MoodLog.findOne({
      user:     req.user.id,
      loggedAt: { $gte: startOfDay }
    }).sort({ loggedAt: -1 });

    return res.status(200).json({
      success: true,
      entry: entry || null    // null means no mood logged today yet
    });
  } catch (err) {
    console.error('getTodayMood error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};