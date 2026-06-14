const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'therapist', 'bot'],
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },
  text: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  readAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const chatHistorySchema = new mongoose.Schema({
  // One chat thread per user-therapist pair
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  therapistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Therapist',
    required: false, // Optional for AI chats
  },

  messages: [messageSchema],

  // Last message preview for inbox
  lastMessage: {
    type: String,
    default: '',
  },
  lastMessageAt: {
    type: Date,
    default: null,
  },
  lastMessageBy: {
    type: String,
    enum: ['user', 'therapist', ''],
    default: '',
  },

  // Unread counts
  unreadByUser: { type: Number, default: 0 },
  unreadByTherapist: { type: Number, default: 0 },

}, { timestamps: true });

// One thread per user-therapist pair
chatHistorySchema.index({ userId: 1, therapistId: 1 }, { unique: true });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);