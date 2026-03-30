const Wallet = require('../models/Wallet');
const Therapist = require('../models/Therapist');

// GET /api/wallet  — get wallet balance + history
const getWallet = async (req, res) => {
    try {
        let wallet = await Wallet.findOne({ user: req.user.id });

        // create wallet if doesn't exist yet
        if (!wallet) {
            wallet = await Wallet.create({ user: req.user.id, balance: 0 });
        }

        res.json(wallet);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/wallet/add  — add money to wallet (simulated top-up)
const addFunds = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        let wallet = await Wallet.findOne({ user: req.user.id });
        if (!wallet) {
            wallet = await Wallet.create({ user: req.user.id, balance: 0 });
        }

        wallet.balance += Number(amount);
        wallet.transactions.push({
            type: 'credit',
            amount: Number(amount),
            description: `Wallet top-up of ₹${amount}`
        });

        await wallet.save();
        res.json({ message: 'Funds added', balance: wallet.balance });

    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/wallet/pay  — deduct session fee before booking
const payForSession = async (req, res) => {
    try {
        const { therapistId } = req.body;

        const therapist = await Therapist.findById(therapistId);
        if (!therapist) {
            return res.status(404).json({ message: 'Therapist not found' });
        }

        const fee = therapist.sessionFee;

        let wallet = await Wallet.findOne({ user: req.user.id });
        if (!wallet || wallet.balance < fee) {
            return res.status(400).json({
                message: `Insufficient balance. Need ₹${fee}, have ₹${wallet ? wallet.balance : 0}`
            });
        }

        // Platform takes 20% commission
        const commission = Math.round(fee * 0.2);
        const therapistEarning = fee - commission;

        // Deduct from user wallet
        wallet.balance -= fee;
        wallet.transactions.push({
            type: 'debit',
            amount: fee,
            description: `Session booked with ${therapist.name}`
        });
        await wallet.save();

        // Add to therapist earnings
        therapist.earnings += therapistEarning;
        await therapist.save();

        res.json({
            message: 'Payment successful',
            deducted: fee,
            balance: wallet.balance,
            commission,
            therapistEarning
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = { getWallet, addFunds, payForSession };