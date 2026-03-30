const User = require('../models/User');

/* ─────────────────────────────────────────
   GET /api/user/profile
   Returns logged-in user's profile (no password)
───────────────────────────────────────── */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ─────────────────────────────────────────
   PUT /api/user/profile
   Update name, email, avatar, preferences
───────────────────────────────────────── */
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, avatar, preferences } = req.body;

    // Build update object — only include fields that were sent
    const updates = {};
    if (name)        updates.name        = name.trim();
    if (email)       updates.email       = email.toLowerCase().trim();
    if (avatar)      updates.avatar      = avatar;
    if (preferences) updates.preferences = preferences;

    // If email is changing, check it's not taken by another user
    if (email) {
      const existing = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: req.user.id }   // exclude current user
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'This email is already used by another account.'
        });
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updated
    });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};