const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['credit', 'debit', 'withdrawal', 'refund'],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    description: {
        type: String,
        default: '',
    },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BookedSession',
        default: null,
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'completed',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const walletSchema = new mongoose.Schema({

    therapistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Therapist',
        default: null,
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },

    // ── Balances ───────────────────────────────────────────
    balance: {
        type: Number,
        default: 0,
        min: 0,
    },
    totalEarned: {
        type: Number,
        default: 0,
    },
    totalWithdrawn: {
        type: Number,
        default: 0,
    },
    pendingWithdrawal: {
        type: Number,
        default: 0,
    },

    // ── Transaction history ────────────────────────────────
    transactions: [transactionSchema],

    // ── Payout method (copied from therapist profile) ──────
    payoutMethod: {
        type: String,
        enum: ['upi', 'bank', 'none'],
        default: 'none',
    },
    upiId: { type: String, default: '' },
    bankAccountName: { type: String, default: '' },
    bankAccountNumber: { type: String, default: '' },
    bankIFSC: { type: String, default: '' },

}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);