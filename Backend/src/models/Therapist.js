const mongoose = require('mongoose');

const therapistSchema = new mongoose.Schema({
  // ── Auth (linked to TherapistUser login account) ──────────────────────────
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TherapistUser',
    required: true,
    unique: true,
  },

  // ── Personal Info ─────────────────────────────────────────────────────────
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  gender: { type: String, enum: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
  profilePhoto: { type: String, default: '' }, // Cloudinary URL or local path

  bio: {
    type: String,
    maxlength: 1000,
    default: '',
  },

  // ── Professional Info ─────────────────────────────────────────────────────
  licenseNumber: { type: String, trim: true, default: '' },
  licenseDocument: { type: String, default: '' }, // URL of uploaded document
  yearsOfExperience: { type: Number, default: 0, min: 0 },
  education: [
    {
      degree: { type: String },
      institution: { type: String },
      year: { type: Number },
    },
  ],

  // ── Specialties & Languages ───────────────────────────────────────────────
  specialties: [
    {
      type: String,
      enum: [
        'Anxiety',
        'Depression',
        'Trauma & PTSD',
        'Relationship Issues',
        'Stress Management',
        'Grief & Loss',
        'OCD',
        'Addiction',
        'Family Therapy',
        'Child & Adolescent',
        'LGBTQ+',
        'Career Counseling',
        'Sleep Issues',
        'Self-esteem',
        'Other',
      ],
    },
  ],

  languages: [
    {
      type: String,
      enum: ['English', 'Hindi', 'Punjabi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Other'],
    },
  ],

  // ── Session Preferences ───────────────────────────────────────────────────
  sessionTypes: [
    {
      type: String,
      enum: ['Video', 'Chat', 'Audio'],
    },
  ],

  sessionFee: {
    type: Number,
    required: true,
    default: 500, // in INR
    min: 0,
  },

  sessionDuration: {
    type: Number,
    default: 60, // minutes
    enum: [30, 45, 60, 90],
  },

  // ── Platform Status ───────────────────────────────────────────────────────
  isApproved: { type: Boolean, default: false }, // Admin must approve
  isActive: { type: Boolean, default: true },
  isOnline: { type: Boolean, default: false },

  onboardingComplete: { type: Boolean, default: false },

  // ── Stats (updated automatically) ────────────────────────────────────────
  totalSessions: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },

  // ── Payout Info ───────────────────────────────────────────────────────────
  bankAccountName: { type: String, default: '' },
  bankAccountNumber: { type: String, default: '' },
  bankIFSC: { type: String, default: '' },
  upiId: { type: String, default: '' },

}, { timestamps: true });

// Index for search/filter queries
// Separate indexes for array fields to avoid 'parallel arrays' error
therapistSchema.index({ specialties: 1, isApproved: 1, isActive: 1 });
therapistSchema.index({ languages: 1, isApproved: 1, isActive: 1 });
therapistSchema.index({ sessionFee: 1 });

module.exports = mongoose.model('Therapist', therapistSchema);