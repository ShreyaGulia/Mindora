const mongoose = require('mongoose');

const therapistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },       // e.g. "Clinical Psychologist"
  institution: { type: String },                // e.g. "NIMHANS, Bengaluru"
  quote: { type: String },
  experience: { type: String },                 // e.g. "5+ years"
  mode: { type: String },                       // "Online" or "Online / Offline"
  languages: [String],                          // ["English", "Hindi"]
  tags: [String],                               // ["Anxiety", "CBT", "Stress"]
  rating: { type: Number, default: 4.9 },
  reviewCount: { type: Number, default: 0 },
  available: { type: Boolean, default: true },
  color: { type: String, default: 'green' }     // for frontend card styling
});

module.exports = mongoose.model('Therapist', therapistSchema);