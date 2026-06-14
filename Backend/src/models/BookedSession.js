const mongoose = require('mongoose');

const bookedSessionSchema = new mongoose.Schema({

  // ── Participants ───────────────────────────────────────────────────────────
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  therapistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Therapist',
    required: true,
  },

  // ── Session details ────────────────────────────────────────────────────────
  scheduledAt: {
    type: Date,
    required: true,
  },
  durationMins: {
    type: Number,
    default: 60,
    enum: [30, 45, 60, 90],
  },
  sessionType: {
    type: String,
    enum: ['Video', 'Chat', 'Audio'],
    default: 'Video',
  },

  // ── Status ─────────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'pending',
  },

  // ── Payment ────────────────────────────────────────────────────────────────
  sessionFee: {
    type: Number,
    required: true,
    min: 0,
  },
  platformFee: {
    type: Number,
    default: 0, // 20% of sessionFee
  },
  therapistEarning: {
    type: Number,
    default: 0, // sessionFee - platformFee (80%)
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending',
  },
  paymentIntentId: {
    type: String,  // Stripe payment intent ID
    default: '',
  },
  paidAt: {
    type: Date,
    default: null,
  },

  // ── Cancellation ───────────────────────────────────────────────────────────
  cancelledBy: {
    type: String,
    enum: ['user', 'therapist', 'admin', ''],
    default: '',
  },
  cancelReason: {
    type: String,
    default: '',
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  refundStatus: {
    type: String,
    enum: ['none', 'pending', 'processed'],
    default: 'none',
  },

  // ── Session notes (therapist private) ─────────────────────────────────────
  therapistNotes: {
    type: String,
    default: '',
    select: false, // never sent to client by default
  },

  // ── Review (submitted by client after session) ─────────────────────────────
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: 500,
      default: '',
    },
    createdAt: {
      type: Date,
    },
  },

  // ── Video room (for Phase 2) ───────────────────────────────────────────────
  roomId: {
    type: String,
    default: '',
  },
  roomUrl: {
    type: String,
    default: '',
  },
  // ── Reference ID ────────────────────────────────────────────────────────
  ref: {
    type: String,
    unique: true,
    sparse: true, // handles nulls if needed, but we will generate it
  },

}, { timestamps: true });

// ── Indexes for common queries ─────────────────────────────────────────────
bookedSessionSchema.index({ therapistId: 1, scheduledAt: 1 });
bookedSessionSchema.index({ userId: 1, scheduledAt: -1 });
bookedSessionSchema.index({ status: 1 });
bookedSessionSchema.index({ paymentIntentId: 1 });

// ── Auto-calculate earnings and generate REF before save ─────────────────────
bookedSessionSchema.pre('save', function () {
  // Generate a random Reference ID like MD-A1B2C if not present
  if (!this.ref) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randomStr = '';
    for (let i = 0; i < 5; i++) {
        randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.ref = `MD-${randomStr}`;
  }

  if (this.isModified('sessionFee') || this.isNew) {
    this.platformFee = Math.round(this.sessionFee * 0.20);
    this.therapistEarning = this.sessionFee - this.platformFee;
  }
  if (this.isModified('status') && this.status === 'cancelled' && !this.cancelledAt) {
    this.cancelledAt = new Date();
  }
});

module.exports = mongoose.model('BookedSession', bookedSessionSchema);