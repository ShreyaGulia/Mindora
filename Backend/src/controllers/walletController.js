const Wallet = require('../models/Wallet');
const Therapist = require('../models/Therapist');
const BookedSession = require('../models/BookedSession');

// ─────────────────────────────────────────────────────────────────────────────
// Helper — get or create wallet for a therapist
// ─────────────────────────────────────────────────────────────────────────────
async function getOrCreateWallet(id, type = 'therapist') {
    const query = type === 'therapist' ? { therapistId: id } : { userId: id };
    let wallet = await Wallet.findOne(query);
    if (!wallet) {
        wallet = await Wallet.create(query);
    }
    return wallet;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL — called automatically when a session is marked completed
// Credits therapist's wallet with their 80% earning
// Export this so paymentController / sessionController can call it
// ─────────────────────────────────────────────────────────────────────────────
exports.creditSessionEarning = async (therapistId, sessionId, amount, description) => {
    try {
        const wallet = await getOrCreateWallet(therapistId);
        
        // Ensure amount is a valid number
        const creditAmount = Number(amount) || 0;

        if (creditAmount > 0) {
            wallet.balance += creditAmount;
            wallet.totalEarned += creditAmount;

            wallet.transactions.push({
                type: 'credit',
                amount: creditAmount,
                description: description || 'Session earning',
                sessionId,
                status: 'completed',
            });

            await wallet.save();

            // Also update totalEarnings on Therapist profile
            await Therapist.findByIdAndUpdate(therapistId, {
                $inc: { totalEarnings: creditAmount },
            });
        }

        return wallet;
    } catch (err) {
        console.error('creditSessionEarning error:', err);
        throw err;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallet
// Returns therapist's wallet balance + last 20 transactions
// ─────────────────────────────────────────────────────────────────────────────
exports.getWallet = async (req, res) => {
    try {
        let ownerId;
        let type;

        if (req.therapistId) {
            const profile = await Therapist.findOne({ userId: req.therapistId });
            if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });
            ownerId = profile._id;
            type = 'therapist';
        } else if (req.user) {
            ownerId = req.user._id;
            type = 'user';
        } else {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const wallet = await getOrCreateWallet(ownerId, type);

        // Return transactions newest first
        const transactions = [...wallet.transactions]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 20);

        const responseData = {
            balance: wallet.balance,
            transactions
        };

        if (type === 'therapist') {
            responseData.totalEarned = wallet.totalEarned;
            responseData.totalWithdrawn = wallet.totalWithdrawn;
            responseData.pendingWithdrawal = wallet.pendingWithdrawal;
            responseData.payoutMethod = wallet.payoutMethod;
        }

        res.json({
            success: true,
            data: responseData,
            // For backward compatibility with simpler frontends
            balance: wallet.balance,
            transactions
        });
    } catch (err) {
        console.error('getWallet error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallet/withdraw
// Therapist requests a withdrawal
// Body: { amount, method: 'upi' | 'bank' }
// ─────────────────────────────────────────────────────────────────────────────
exports.requestWithdrawal = async (req, res) => {
    try {
        const { amount, method } = req.body;

        if (!amount || isNaN(amount) || Number(amount) < 100) {
            return res.status(400).json({
                success: false,
                message: 'Minimum withdrawal amount is ₹100.',
            });
        }

        if (!['upi', 'bank'].includes(method)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payout method. Choose upi or bank.',
            });
        }

        const profile = await Therapist.findOne({ userId: req.therapistId });
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found.' });
        }

        const wallet = await getOrCreateWallet(profile._id);
        const withdrawAmount = Number(amount);

        // Check sufficient balance
        if (wallet.balance < withdrawAmount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. Available: ₹${wallet.balance}.`,
            });
        }

        // Check payout details exist
        if (method === 'upi' && !wallet.upiId && !profile.upiId) {
            return res.status(400).json({
                success: false,
                message: 'No UPI ID found. Add it in your profile first.',
            });
        }
        if (method === 'bank' && !wallet.bankAccountNumber && !profile.bankAccountNumber) {
            return res.status(400).json({
                success: false,
                message: 'No bank account found. Add it in your profile first.',
            });
        }

        // Deduct from balance, add to pending
        wallet.balance -= withdrawAmount;
        wallet.pendingWithdrawal += withdrawAmount;

        wallet.transactions.push({
            type: 'withdrawal',
            amount: withdrawAmount,
            description: `Withdrawal via ${method.toUpperCase()} — pending processing`,
            status: 'pending',
        });

        await wallet.save();

        // In production: trigger actual bank transfer here (Razorpay Payout / Stripe Payout)
        // For now we mark it as pending and admin processes it

        res.json({
            success: true,
            message: `Withdrawal of ₹${withdrawAmount} requested. Will be processed within 2–3 business days.`,
            data: {
                balance: wallet.balance,
                pendingWithdrawal: wallet.pendingWithdrawal,
            },
        });
    } catch (err) {
        console.error('requestWithdrawal error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallet/payout-details
// Save / update therapist's payout method and details
// Body: { method, upiId } OR { method, bankAccountName, bankAccountNumber, bankIFSC }
// ─────────────────────────────────────────────────────────────────────────────
exports.savePayoutDetails = async (req, res) => {
    try {
        const { method, upiId, bankAccountName, bankAccountNumber, bankIFSC } = req.body;

        if (!['upi', 'bank'].includes(method)) {
            return res.status(400).json({ success: false, message: 'Choose upi or bank.' });
        }

        const profile = await Therapist.findOne({ userId: req.therapistId });
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found.' });
        }

        const wallet = await getOrCreateWallet(profile._id);

        wallet.payoutMethod = method;

        if (method === 'upi') {
            if (!upiId) return res.status(400).json({ success: false, message: 'UPI ID is required.' });
            wallet.upiId = upiId.trim();
        } else {
            if (!bankAccountNumber || !bankIFSC || !bankAccountName) {
                return res.status(400).json({
                    success: false,
                    message: 'Bank account name, number and IFSC are required.',
                });
            }
            wallet.bankAccountName = bankAccountName.trim();
            wallet.bankAccountNumber = bankAccountNumber.trim();
            wallet.bankIFSC = bankIFSC.trim().toUpperCase();
        }

        await wallet.save();

        res.json({ success: true, message: 'Payout details saved.' });
    } catch (err) {
        console.error('savePayoutDetails error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallet/transactions
// Full transaction history with pagination
// Query: ?page=1&limit=20
// ─────────────────────────────────────────────────────────────────────────────
exports.getTransactions = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 20);

        const profile = await Therapist.findOne({ userId: req.therapistId });
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found.' });
        }

        const wallet = await getOrCreateWallet(profile._id);

        const sorted = [...wallet.transactions]
            .sort((a, b) => b.createdAt - a.createdAt);

        const total = sorted.length;
        const paginated = sorted.slice((page - 1) * limit, page * limit);

        res.json({
            success: true,
            data: {
                transactions: paginated,
                total,
                page,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error('getTransactions error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};