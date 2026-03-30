/* =============================================================
   Mindora — app.js  (Phase 4 Final)
   All routes wired: auth, user, therapists,
   sessions, mood, chat history, AI chat
   ============================================================= */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { generalLimiter } = require('./middleware/rateLimiter');
const wellnessRoutes = require('./routes/wellnessRoutes');
const walletRoutes = require('./routes/walletRoutes');
const therapistAuthRoutes = require('./routes/therapistAuthRoutes');
const therapistDashRoutes = require('./routes/therapistDashRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// ── CORS ──
app.use(cors({
  origin: true,
  credentials: true
}));

// ── Parsers ──
app.use(express.json());
app.use(cookieParser());

// ── Logger ──
app.use(morgan('dev'));

// ── General rate limiter on all routes ──
app.use(generalLimiter);

// ── Routes ──
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/user/profile', require('./routes/userRoutes'));
app.use('/api/therapists', require('./routes/therapistRoutes'));
app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/mood', require('./routes/moodRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/ai', require('./routes/aiChatRoutes'));
app.use('/api/wellness', wellnessRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/therapist-auth', therapistAuthRoutes);
app.use('/api/therapist', therapistDashRoutes);
app.use('/api/admin', adminRoutes);  // Phase 4 AI

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Mindora API is running',
    phase: 'Phase 4 — AI Chatbot Integration active'
  });
});

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found.`
  });
});

module.exports = app;