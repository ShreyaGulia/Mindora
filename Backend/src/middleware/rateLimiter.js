/* =============================================================
   Mindora — Rate Limiter for AI Endpoint
   Limits AI calls per user per hour to control API costs.
   Uses express-rate-limit (no Redis needed for now).
   ============================================================= */

const rateLimit = require('express-rate-limit');

/* ── AI chat rate limiter ── */
const aiChatLimiter = rateLimit({
  windowMs:         60 * 60 * 1000,                       // 1 hour window
  max:              parseInt(process.env.AI_RATE_LIMIT_PER_HOUR) || 20,
  standardHeaders:  true,                                  // Return rate limit info in headers
  legacyHeaders:    false,
  keyGenerator:     (req, res) => {
    // Use user ID if authenticated, otherwise IP address
    if (req.user?.id) return req.user.id;
    return rateLimit.ipKeyGenerator(req, res);
  },
  message: {
    success: false,
    message: `You've reached the AI chat limit for this hour. Please try again later, or take a short break 🌿`
  },
  skip: (req) => {
    // Skip rate limiting in development if needed
    return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
  }
});

/* ── General API rate limiter (for auth routes etc.) ── */
const generalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,   // 15 minutes
  max:             100,              // 100 requests per 15 min
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down and try again shortly.'
  }
});

module.exports = { aiChatLimiter, generalLimiter };