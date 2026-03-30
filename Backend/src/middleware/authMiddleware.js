const jwt = require('jsonwebtoken');
const User = require('../models/User');

/* ─────────────────────────────────────────
   protect  —  attach req.user on every protected route
   Usage: router.get('/my-sessions', protect, controller)
───────────────────────────────────────── */
const protect = async (req, res, next) => {
  try {
    // 1. Read token from Authorization header: "Bearer <token>"
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify token signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: decoded.id || decoded._id || decoded.userId
      };
      // Removing early next() to prevent executing controllers twice
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please refresh your token.',
          expired: true     // frontend checks this flag to call /api/auth/refresh
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.'
      });
    }

    // 3. Attach user to request (without password)
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.'
      });
    }

    req.user = user;
    next();

  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { protect };