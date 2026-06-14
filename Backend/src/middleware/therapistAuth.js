const jwt = require('jsonwebtoken');

const therapistProtect = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'therapist') {
            return res.status(403).json({ message: 'Access denied — therapists only' });
        }

        req.user = { id: decoded.id, email: decoded.email, name: decoded.name, isVerified: decoded.isVerified };
        req.therapistId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token invalid or expired' });
    }
};

module.exports = therapistProtect;