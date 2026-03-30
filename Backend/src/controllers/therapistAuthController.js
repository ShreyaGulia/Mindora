const TherapistUser = require('../models/TherapistUser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const createToken = (t) => jwt.sign(
    { id: t._id, email: t.email, role: 'therapist' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
);

// POST /api/therapist-auth/register
const register = async (req, res) => {
    try {
        const { name, email, password, specialization, experience, institution, languages } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' });
        }

        const existing = await TherapistUser.findOne({ email });
        if (existing) return res.status(400).json({ message: 'Email already registered' });

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);

        const therapist = await TherapistUser.create({
            name, email, password: hashed,
            specialization, experience, institution,
            languages: languages ? languages.split(',').map(l => l.trim()) : []
        });

        res.status(201).json({
            message: 'Registered successfully. Await admin verification.',
            therapist: { id: therapist._id, name: therapist.name, email: therapist.email }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/therapist-auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const therapist = await TherapistUser.findOne({ email });
        if (!therapist) return res.status(401).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, therapist.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        if (!therapist.isVerified) {
            return res.status(403).json({ message: 'Your account is pending admin verification.' });
        }

        const token = createToken(therapist);

        res.json({
            token,
            therapist: {
                id: therapist._id,
                name: therapist.name,
                email: therapist.email,
                earnings: therapist.earnings,
                isVerified: therapist.isVerified
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = { register, login };