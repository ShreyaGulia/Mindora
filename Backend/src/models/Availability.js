const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({

    therapistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Therapist',
        required: true,
        unique: true,   // one availability doc per therapist
    },

    // ── Daily working window (applies to all active days) ──────────────────────
    // stored as "HH:MM" 24-hour strings e.g. "10:00", "18:00"
    workStart: { type: String, default: '10:00' },
    workEnd: { type: String, default: '18:00' },

    // ── Which days of the week are active ──────────────────────────────────────
    // 0 = Sunday … 6 = Saturday
    activeDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5], // Mon–Fri by default
        validate: {
            validator: arr => arr.every(d => d >= 0 && d <= 6),
            message: 'activeDays must be 0–6',
        },
    },

    // ── Blocked dates (therapist marks as unavailable) ─────────────────────────
    // stored as "YYYY-MM-DD" strings for easy comparison
    blockedDates: {
        type: [String],
        default: [],
    },

}, { timestamps: true });

module.exports = mongoose.model('Availability', availabilitySchema);