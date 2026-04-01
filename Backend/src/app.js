const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const therapistRoutes = require('./routes/therapistRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const moodRoutes = require('./routes/moodRoutes');
const chatRoutes = require('./routes/chatRoutes');
const wellnessRoutes = require('./routes/wellnessRoutes');
const walletRoutes = require('./routes/walletRoutes');
const therapistAuthRoutes = require('./routes/therapistAuthRoutes');
const therapistDashRoutes = require('./routes/therapistDashRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
  credentials: true
}));

// ─────────────────────────────────────────────────────
// IMPORTANT: Stripe webhook needs the RAW request body
// to verify the signature. We capture it BEFORE express.json()
// parses the body for the webhook route only.
// For all other routes, express.json() runs normally.
// ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payment/webhook') {
    let rawData = '';
    req.on('data', chunk => { rawData += chunk; });
    req.on('end', () => {
      req.rawBody = rawData;
      try {
        req.body = JSON.parse(rawData);
      } catch (e) {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
});

app.use(express.json());
app.use(morgan('dev'));

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mindora API is running' });
});

// ── All routes ──
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/therapists', therapistRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/wellness', wellnessRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/therapist-auth', therapistAuthRoutes);
app.use('/api/therapist', therapistDashRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong', error: err.message });
});

module.exports = app;