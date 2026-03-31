const TherapistUser = require('../models/TherapistUser');

// GET /api/therapists  — all verified registered therapists
const getAllTherapists = async (req, res) => {
  try {
    const therapists = await TherapistUser.find({ isVerified: true })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(therapists);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/therapists/:id  — single therapist
const getTherapistById = async (req, res) => {
  try {
    const therapist = await TherapistUser.findById(req.params.id).select('-password');

    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found' });
    }

    res.json(therapist);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getAllTherapists, getTherapistById };