const BookedSession = require('../models/BookedSession');
const Therapist     = require('../models/Therapist');

/* ─────────────────────────────────────────
   POST /api/sessions/book
   Save a new session booking
   Maps to your existing booking modal flow
───────────────────────────────────────── */
exports.bookSession = async (req, res) => {
  try {
    const { therapistId, date, time, mode, concerns, note } = req.body;

    // 1. Validate required fields
    if (!therapistId || !date || !time || !mode) {
      return res.status(400).json({
        success: false,
        message: 'Therapist, date, time, and mode are required.'
      });
    }

    // 2. Confirm therapist exists
    const therapist = await Therapist.findById(therapistId);
    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: 'Therapist not found.'
      });
    }

    // 3. Generate unique booking reference (e.g. REF-A1B2C3)
    const ref = 'REF-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    // 4. Save session
    const session = await BookedSession.create({
      user:      req.user.id,   // from protect middleware
      therapist: therapistId,
      date,
      time,
      mode,
      concerns:  concerns || '',
      note:      note     || '',
      ref
    });

    // 5. Populate therapist details for response
    await session.populate('therapist', 'name role institution');

    return res.status(201).json({
      success: true,
      message: 'Session booked successfully.',
      session
    });
  } catch (err) {
    console.error('bookSession error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ─────────────────────────────────────────
   GET /api/sessions/my
   Fetch all sessions for the logged-in user
   (most recent first)
───────────────────────────────────────── */
exports.getMySessions = async (req, res) => {
  try {
    const sessions = await BookedSession
      .find({ user: req.user.id })
      .populate('therapist', 'name role institution color')
      .sort({ bookedAt: -1 });   // newest first

    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (err) {
    console.error('getMySessions error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ─────────────────────────────────────────
   PUT /api/sessions/:id/cancel
   Cancel a booked session
───────────────────────────────────────── */
exports.cancelSession = async (req, res) => {
  try {
    const session = await BookedSession.findOne({
      _id:  req.params.id,
      user: req.user.id       // ensure user owns this session
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found.'
      });
    }

    if (session.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Session is already cancelled.'
      });
    }

    session.status = 'cancelled';
    await session.save();

    return res.status(200).json({
      success: true,
      message: 'Session cancelled.',
      session
    });
  } catch (err) {
    console.error('cancelSession error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};