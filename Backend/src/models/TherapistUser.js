const mongoose = require('mongoose');

const therapistUserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, default: 'therapist' },

    // Profile details (filled after registration)
    specialization: { type: String },
    experience: { type: String },
    languages: [String],
    institution: { type: String },
    pricePerMin: { type: Number, default: 2 },
    sessionFee: { type: Number, default: 299 },

    // Admin verifies this
    isVerified: { type: Boolean, default: false },
    documents: [String],   // uploaded doc URLs (for future file upload)

    // Availability
    availability: {
        days: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' }
    },

    earnings: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TherapistUser', therapistUserSchema);