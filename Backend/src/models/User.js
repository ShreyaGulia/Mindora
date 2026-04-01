const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },

  // ── Stripe customer ID (created on first payment) ──
  stripeCustomerId: {
    type: String,
    default: null
  },

  // ── Subscription plan ──
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free'
  },
  planExpiresAt: {
    type: Date,
    default: null
  },

  // ── AI message rate limiting (resets every 24 hours) ──
  aiMessagesToday: {
    type: Number,
    default: 0
  },
  aiMessagesResetAt: {
    type: Date,
    default: Date.now
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);