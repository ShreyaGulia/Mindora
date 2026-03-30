const Therapist = require('../models/Therapist');

/* ─────────────────────────────────────────
   GET /api/therapists
   Returns all therapists from DB
───────────────────────────────────────── */
exports.getAllTherapists = async (req, res) => {
  try {
    const therapists = await Therapist.find({ available: true });
    return res.status(200).json({
      success: true,
      count: therapists.length,
      therapists
    });
  } catch (err) {
    console.error('getAllTherapists error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ─────────────────────────────────────────
   GET /api/therapists/:id
   Returns single therapist by ID
───────────────────────────────────────── */
exports.getTherapistById = async (req, res) => {
  try {
    const therapist = await Therapist.findById(req.params.id);
    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: 'Therapist not found.'
      });
    }
    return res.status(200).json({ success: true, therapist });
  } catch (err) {
    console.error('getTherapistById error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};