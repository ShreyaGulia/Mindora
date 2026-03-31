const BookedSession = require('../models/BookedSession');
const TherapistUser = require('../models/TherapistUser');

// POST /api/sessions/book
const bookSession = async (req, res) => {
  try {
    const { therapistId, date, time, mode, concerns, note } = req.body;

    // Validate therapist exists and is verified
    const therapist = await TherapistUser.findById(therapistId);
    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found' });
    }
    if (!therapist.isVerified) {
      return res.status(400).json({ message: 'This therapist is not yet verified' });
    }

    const ref = 'REF-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    const session = await BookedSession.create({
      user: req.user.id,
      therapist: therapistId,
      date,
      time,
      mode,
      concerns,
      note,
      ref,
      status: 'confirmed'
    });

    const populated = await BookedSession.findById(session._id)
      .populate('therapist', 'name role specialization');

    res.status(201).json({
      message: 'Session booked successfully',
      session: populated
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/sessions/my
const getMySessions = async (req, res) => {
  try {
    const sessions = await BookedSession.find({ user: req.user.id })
      .populate('therapist', 'name specialization role')
      .sort({ bookedAt: -1 });

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PUT /api/sessions/:id/cancel
const cancelSession = async (req, res) => {
  try {
    const session = await BookedSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to cancel this session' });
    }

    session.status = 'cancelled';
    await session.save();

    res.json({ message: 'Session cancelled successfully', session });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { bookSession, getMySessions, cancelSession };