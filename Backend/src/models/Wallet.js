const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    type: { type: String, enum: ['credit', 'debit'] },
    amount: { type: Number },
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const walletSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
    balance: { type: Number, default: 0 },
    transactions: [transactionSchema]
});

module.exports = mongoose.model('Wallet', walletSchema);