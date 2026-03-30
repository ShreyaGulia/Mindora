/* =============================================================
   Mindora — AI Chat Controller (Groq Version)
   Replaces Claude with Groq (OpenAI-style API)
   ============================================================= */

const Groq = require('groq-sdk');
const SYSTEM_PROMPT = require('../config/systemPrompt');
const { detectCrisis } = require('../config/crisisDetector');
const ChatHistory = require('../models/ChatHistory');

const AI_MODEL = process.env.AI_MODEL || 'llama-3.1-8b-instant';
const AI_MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS) || 500;

const CONTEXT_WINDOW = 10;

/* ─────────────────────────────────────────
   POST /api/ai/chat
───────────────────────────────────────── */
exports.chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    // 1. Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required.'
      });
    }

    const trimmedMessage = message.trim();

    // 2. ✅ Crisis detection FIRST
    const { isCrisis, response: crisisResponse } = detectCrisis(trimmedMessage);
    if (isCrisis) {
      return res.status(200).json({
        success: true,
        reply: crisisResponse,
        isCrisis: true
      });
    }

    // 3. Build conversation history
    const recentHistory = history.slice(-CONTEXT_WINDOW);

    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT // 👈 IMPORTANT CHANGE (Groq style)
      },
      ...recentHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      {
        role: "user",
        content: trimmedMessage
      }
    ];

    // 4. ✅ Call Groq API
    const client = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });

    const aiResponse = await client.chat.completions.create({
      model: AI_MODEL,
      messages,
      max_tokens: AI_MAX_TOKENS
    });

    // 5. Extract reply (simpler than Claude)
    const reply = aiResponse.choices[0].message.content;

    // 6. Save chat history (unchanged)
    if (req.user) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let chatSession = await ChatHistory.findOne({
          user: req.user.id,
          createdAt: { $gte: today }
        });

        if (!chatSession) {
          chatSession = new ChatHistory({ user: req.user.id, messages: [] });
        }

        chatSession.messages.push(
          { sender: 'user', text: trimmedMessage },
          { sender: 'bot', text: reply }
        );

        await chatSession.save();
      } catch (saveErr) {
        console.error('Chat history save error:', saveErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      reply,
      isCrisis: false
    });

  } catch (err) {
    console.error('AI chat error:', err);

    // ✅ Groq/OpenAI-style error handling
    if (err.status === 401) {
      return res.status(500).json({
        success: false,
        message: 'AI service authentication failed. Check Groq API key.'
      });
    }

    if (err.status === 429) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please slow down.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Something went wrong.',
      reply: "I'm having a little trouble right now 🌿 Please try again."
    });
  }
};