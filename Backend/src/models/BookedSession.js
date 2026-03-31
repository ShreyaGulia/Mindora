const mongoose = require('mongoose');

const bookedSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  therapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TherapistUser',
    required: true
  },
  date: { type: String, required: true },       // "15 Jun 2025"
  time: { type: String, required: true },       // "3:00 PM"
  mode: { type: String, required: true },       // "Video call"
  concerns: { type: String },                   // "Anxiety, Stress"
  note: { type: String },
  status: {
    type: String,
    enum: ['confirmed', 'completed', 'cancelled'],
    default: 'confirmed'
  },
  ref: { type: String, unique: true },          // "REF-ABC123"
  bookedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BookedSession', bookedSessionSchema);