const Admin = require('../models/Admin');
const TherapistUser = require('../models/TherapistUser');
const User = require('../models/User');
const BookedSession = require('../models/BookedSession');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/admin/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: admin._id, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ token, admin: { name: admin.name, email: admin.email } });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/admin/stats
const getStats = async (req, res) => {
    try {
        const [users, therapists, sessions, pendingTherapists] = await Promise.all([
            User.countDocuments(),
            TherapistUser.countDocuments({ isVerified: true }),
            BookedSession.countDocuments(),
            TherapistUser.countDocuments({ isVerified: false })
        ]);

        res.json({ users, therapists, sessions, pendingTherapists });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/admin/therapists/pending
const getPendingTherapists = async (req, res) => {
    try {
        const list = await TherapistUser.find({ isVerified: false }).select('-password');
        res.json(list);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/admin/therapists/:id/verify
const verifyTherapist = async (req, res) => {
    try {
        const t = await TherapistUser.findByIdAndUpdate(
            req.params.id,
            { isVerified: true },
            { new: true }
        ).select('-password');

        res.json({ message: `${t.name} has been verified`, therapist: t });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/admin/therapists/:id
const removeTherapist = async (req, res) => {
    try {
        await TherapistUser.findByIdAndDelete(req.params.id);
        res.json({ message: 'Therapist removed' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/admin/users
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/admin/sessions
const getAllSessions = async (req, res) => {
    try {
        const sessions = await BookedSession.find()
            .populate('user', 'name email')
            .populate('therapist', 'name')
            .sort({ bookedAt: -1 });
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = { login, getStats, getPendingTherapists, verifyTherapist, removeTherapist, getAllUsers, getAllSessions };