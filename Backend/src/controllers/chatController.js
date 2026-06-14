const ChatHistory = require('../models/ChatHistory');
const Therapist = require('../models/Therapist');
const User = require('../models/User');
const BookedSession = require('../models/BookedSession');

// ── Helper: find or create a chat thread ──────────────────────────────────
async function getOrCreateThread(userId, therapistId) {
  let thread = await ChatHistory.findOne({ userId, therapistId });
  if (!thread) {
    thread = await ChatHistory.create({ userId, therapistId, messages: [] });
  }
  return thread;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/threads
// USER AUTH — returns all chat threads for the logged-in user (inbox)
// ─────────────────────────────────────────────────────────────────────────────
exports.getUserThreads = async (req, res) => {
  try {
    const threads = await ChatHistory.find({ userId: req.userId })
      .populate('therapistId', 'fullName profilePhoto specialties isOnline')
      .sort({ lastMessageAt: -1 })
      .select('-messages')
      .lean();

    res.json({ success: true, data: threads });
  } catch (err) {
    console.error('getUserThreads error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/therapist-threads
// THERAPIST AUTH — returns all threads for logged-in therapist
// ─────────────────────────────────────────────────────────────────────────────
exports.getTherapistThreads = async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ userId: req.therapistId });
    if (!therapist) return res.status(404).json({ success: false, message: 'Profile not found.' });

    const threads = await ChatHistory.find({ therapistId: therapist._id })
      .populate('userId', 'name email')
      .sort({ lastMessageAt: -1 })
      .select('-messages')
      .lean();

    res.json({ success: true, data: threads });
  } catch (err) {
    console.error('getTherapistThreads error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/:therapistId
// USER AUTH — load messages between user and a therapist
// ─────────────────────────────────────────────────────────────────────────────
exports.getThread = async (req, res) => {
  try {
    const { therapistId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 50);

    const thread = await ChatHistory.findOne({
      userId: req.userId, therapistId,
    });

    if (!thread) {
      return res.json({ success: true, data: { messages: [], total: 0 } });
    }

    // Mark messages as read
    await ChatHistory.updateOne(
      { userId: req.userId, therapistId },
      { $set: { unreadByUser: 0, 'messages.$[elem].readAt': new Date() } },
      { arrayFilters: [{ 'elem.sender': 'therapist', 'elem.readAt': null }] }
    );

    const total = thread.messages.length;
    const messages = thread.messages
      .slice(-limit * page)
      .slice(0, limit);

    res.json({ success: true, data: { messages, total } });
  } catch (err) {
    console.error('getThread error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/therapist-view/:userId
// THERAPIST AUTH — load messages from therapist's perspective
// ─────────────────────────────────────────────────────────────────────────────
exports.getThreadAsTherapist = async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ userId: req.therapistId });
    if (!therapist) return res.status(404).json({ success: false, message: 'Profile not found.' });

    const { userId } = req.params;

    const thread = await ChatHistory.findOne({
      userId, therapistId: therapist._id,
    });

    if (!thread) {
      return res.json({ success: true, data: { messages: [], total: 0 } });
    }

    // Mark as read by therapist
    await ChatHistory.updateOne(
      { userId, therapistId: therapist._id },
      { $set: { unreadByTherapist: 0 } }
    );

    res.json({ success: true, data: { messages: thread.messages, total: thread.messages.length } });
  } catch (err) {
    console.error('getThreadAsTherapist error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/:therapistId
// USER AUTH — send a message to a therapist
// Body: { text }
// ─────────────────────────────────────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const { therapistId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty.' });
    }
    if (text.length > 2000) {
      return res.status(400).json({ success: false, message: 'Message too long (max 2000 chars).' });
    }

    // Verify therapist exists
    const therapist = await Therapist.findById(therapistId);
    if (!therapist) return res.status(404).json({ success: false, message: 'Therapist not found.' });

    // Check user has a session with this therapist (they must be connected)
    const hasSession = await BookedSession.exists({
      userId: req.userId,
      therapistId,
      status: { $in: ['confirmed', 'completed'] },
    });
    if (!hasSession) {
      return res.status(403).json({
        success: false,
        message: 'You can only message therapists you have booked a session with.',
      });
    }

    const message = {
      sender: 'user',
      senderId: req.userId,
      text: text.trim(),
    };

    const thread = await getOrCreateThread(req.userId, therapistId);
    thread.messages.push(message);
    thread.lastMessage = text.trim().slice(0, 80);
    thread.lastMessageAt = new Date();
    thread.lastMessageBy = 'user';
    thread.unreadByTherapist += 1;
    await thread.save();

    res.json({ success: true, message: 'Message sent.', data: message });
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/therapist-reply/:userId
// THERAPIST AUTH — therapist sends a message to a client
// Body: { text }
// ─────────────────────────────────────────────────────────────────────────────
exports.therapistReply = async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ userId: req.therapistId });
    if (!therapist) return res.status(404).json({ success: false, message: 'Profile not found.' });

    const { userId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty.' });
    }

    const message = {
      sender: 'therapist',
      senderId: therapist._id,
      text: text.trim(),
    };

    const thread = await getOrCreateThread(userId, therapist._id);
    thread.messages.push(message);
    thread.lastMessage = text.trim().slice(0, 80);
    thread.lastMessageAt = new Date();
    thread.lastMessageBy = 'therapist';
    thread.unreadByUser += 1;
    await thread.save();

    res.json({ success: true, message: 'Reply sent.', data: message });
  } catch (err) {
    console.error('therapistReply error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/unread-count
// USER AUTH — returns total unread message count for badge
// ─────────────────────────────────────────────────────────────────────────────
exports.getUnreadCount = async (req, res) => {
  try {
    const threads = await ChatHistory.find({ userId: req.userId });
    const total = threads.reduce((sum, t) => sum + (t.unreadByUser || 0), 0);
    res.json({ success: true, unread: total });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};