const ChatHistory = require('../models/ChatHistory');
const Groq = require('groq-sdk');

/* ─────────────────────────────────────────
   POST /api/chat/save
   Store user + bot messages for a session
   Called from frontend after chat ends
───────────────────────────────────────── */
exports.saveChat = async (req, res) => {
  try {
    const { messages } = req.body;

    // Validate — messages must be a non-empty array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Messages array is required and cannot be empty.'
      });
    }

    // Validate each message has required fields
    for (const msg of messages) {
      if (!msg.sender || !['user', 'bot'].includes(msg.sender)) {
        return res.status(400).json({
          success: false,
          message: 'Each message must have a sender of "user" or "bot".'
        });
      }
      if (!msg.text || typeof msg.text !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Each message must have a text field.'
        });
      }
    }

    const chat = await ChatHistory.create({
      user: req.user.id,
      messages  // array of { sender, text, time }
    });

    return res.status(201).json({
      success: true,
      message: 'Chat saved successfully.',
      chatId: chat._id
    });
  } catch (err) {
    console.error('saveChat error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ─────────────────────────────────────────
   GET /api/chat/history
   Retrieve past conversations for the user
   Returns most recent 20 sessions
───────────────────────────────────────── */
exports.getChatHistory = async (req, res) => {
  try {
    const chats = await ChatHistory
      .find({ user: req.user.id })
      .sort({ createdAt: -1 })  // newest first
      .limit(20);               // last 20 sessions

    return res.status(200).json({
      success: true,
      count: chats.length,
      chats
    });
  } catch (err) {
    console.error('getChatHistory error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ─────────────────────────────────────────
   GET /api/chat/history/:id
   Get a single chat session by ID
───────────────────────────────────────── */
exports.getChatById = async (req, res) => {
  try {
    const chat = await ChatHistory.findOne({
      _id: req.params.id,
      user: req.user.id     // ensure user owns this chat
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found.'
      });
    }

    return res.status(200).json({ success: true, chat });
  } catch (err) {
    console.error('getChatById error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ─────────────────────────────────────────
   POST /api/ai/chat
   Send message to AI and get response
───────────────────────────────────────── */
exports.aiChat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required and must be a string.'
      });
    }

    // Initialize Groq client
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Build messages array for Groq API
    let messages = [
      { role: 'system', content: 'You are a helpful mental health assistant. Provide supportive, empathetic responses.' }
    ];

    // Add history if provided
    if (history && Array.isArray(history)) {
      messages = messages.concat(history);
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    const response = await groq.chat.completions.create({
      model: process.env.AI_MODEL || 'llama-3.1-8b-instant',
      messages,
      max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 500,
      temperature: 0.7
    });

    const botMessage = response.choices[0].message.content;

    return res.status(200).json({
      success: true,
      response: botMessage
    });
  } catch (err) {
    console.error('aiChat error:', err);
    return res.status(500).json({ success: false, message: 'AI service error.' });
  }
};