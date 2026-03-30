const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getWallet, addFunds, payForSession } = require('../controllers/walletController');

router.get('/', protect, getWallet);
router.post('/add', protect, addFunds);
router.post('/pay', protect, payForSession);

module.exports = router;