const express = require('express');
const router = express.Router();
const walletCtrl = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');
const therapistAuth = require('../middleware/therapistAuth');

const jwt = require('jsonwebtoken');

// A specialized middleware just for Wallet that allows both User and Therapist
const unifiedWalletAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.role === 'therapist') {
            req.therapistId = decoded.id;
            req.user = { id: decoded.id, email: decoded.email };
        } else {
            // It's a user
            req.user = await require('../models/User').findById(decoded.id || decoded.userId).select('-password');
            if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
        }
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

router.get('/', unifiedWalletAuth, walletCtrl.getWallet);
router.get('/transactions', walletCtrl.getTransactions);
router.post('/withdraw', walletCtrl.requestWithdrawal);
router.post('/payout-details', walletCtrl.savePayoutDetails);

module.exports = router;