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
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free'
  },
  avatar: {
    type: String,
    default: ''        // URL or base64 string
  },
  preferences: {
    theme:         { type: String, default: 'light' },
    notifications: { type: Boolean, default: true },
    language:      { type: String, default: 'en' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);