const TherapistUser = require('../models/TherapistUser');
const BookedSession = require('../models/BookedSession');

// GET /api/therapist/dashboard
const getDashboard = async (req, res) => {
    try {
        const therapist = await TherapistUser.findById(req.user.id).select('-password');

        // get all pending sessions for this therapist
        // match by therapist name since BookedSession refs Therapist (catalogue), not TherapistUser
        const sessions = await BookedSession.find()
            .populate('user', 'name email')
            .populate('therapist', 'name')
            .sort({ bookedAt: -1 });

        // filter sessions that match this therapist's name
        const mySessions = sessions.filter(s =>
            s.therapist && s.therapist.name === therapist.name
        );

        res.json({
            therapist,
            sessions: mySessions,
            totalSessions: mySessions.length,
            pendingSessions: mySessions.filter(s => s.status === 'confirmed').length,
            earnings: therapist.earnings
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/therapist/availability
const updateAvailability = async (req, res) => {
    try {
        const { days, start, end, pricePerMin, sessionFee } = req.body;

        const updated = await TherapistUser.findByIdAndUpdate(
            req.user.id,
            { availability: { days, start, end }, pricePerMin, sessionFee },
            { new: true }
        ).select('-password');

        res.json({ message: 'Availability updated', therapist: updated });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/therapist/session/:id/accept
const acceptSession = async (req, res) => {
    try {
        const session = await BookedSession.findByIdAndUpdate(
            req.params.id,
            { status: 'confirmed' },
            { new: true }
        ).populate('user', 'name email');

        res.json({ message: 'Session accepted', session });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/therapist/session/:id/cancel
const cancelSession = async (req, res) => {
    try {
        const session = await BookedSession.findByIdAndUpdate(
            req.params.id,
            { status: 'cancelled' },
            { new: true }
        );

        res.json({ message: 'Session cancelled', session });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = { getDashboard, updateAvailability, acceptSession, cancelSession };