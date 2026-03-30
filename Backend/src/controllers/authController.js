const User       = require('../models/User');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');

// helper — creates a signed JWT token for a user
const createToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );
};

// ─────────────────────────────────────
// POST /api/auth/signup
// ─────────────────────────────────────
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. check all fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill all fields' });
    }

    // 2. check if email already registered
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // 3. hash the password — never store plain text
    const salt           = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. save new user to MongoDB
    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    // 5. create token
    const token = createToken(user);

    // 6. send back token + user info (no password)
    res.status(201).json({
      token,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        plan:  user.plan
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. check fields provided
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password' });
    }

    // 2. find user in DB by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 3. compare entered password with hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 4. create token
    const token = createToken(user);

    // 5. send back token + user info (no password)
    res.json({
      token,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        plan:  user.plan
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────
// GET /api/auth/me  — get logged in user
// ─────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { signup, login, getMe };