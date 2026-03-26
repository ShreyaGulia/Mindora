const mongoose = require('mongoose');

const moodLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mood: {
    type: String,
    enum: ['awful', 'low', 'okay', 'good', 'great'],
    required: true
  },
  note: { type: String },                       // optional journal note
  loggedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MoodLog', moodLogSchema);