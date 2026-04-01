const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Stripe identifiers
    stripePaymentIntentId: { type: String, default: null },
    stripeCustomerId: { type: String, default: null },

    // Amount details
    amount: { type: Number, required: true }, // in smallest unit (paise/cents)
    amountDisplay: { type: Number, required: true }, // in rupees for display
    currency: { type: String, default: 'inr' },

    // What was paid for
    purpose: {
        type: String,
        enum: ['wallet_topup', 'pro_monthly', 'pro_yearly'],
        required: true
    },

    // Payment status
    status: {
        type: String,
        enum: ['pending', 'succeeded', 'failed'],
        default: 'pending'
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Billing', billingSchema);