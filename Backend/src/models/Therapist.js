const mongoose = require('mongoose');

const therapistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  institution: { type: String },
  quote: { type: String },
  experience: { type: String },
  mode: { type: String },
  languages: [String],
  tags: [String],
  rating: { type: Number, default: 4.9 },
  reviewCount: { type: Number, default: 0 },
  available: { type: Boolean, default: true },
  color: { type: String, default: 'green' },

  // NEW — needed for budget matching and wallet deductions
  pricePerMin: { type: Number, default: 2 },   // ₹ per minute during live session
  sessionFee: { type: Number, default: 299 }, // flat booking fee in ₹

  // NEW — needed for therapist role (Phase 2 of document)
  isVerified: { type: Boolean, default: false },
  availability: {
    days: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    start: { type: String, default: '09:00' },
    end: { type: String, default: '18:00' }
  },
  earnings: { type: Number, default: 0 }
});

module.exports = mongoose.model('Therapist', therapistSchema);