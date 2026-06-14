require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mindcare';

async function resetData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Clear booked sessions
    const sessionResult = await db.collection('bookedsessions').deleteMany({});
    console.log(`🗑️  Deleted ${sessionResult.deletedCount} booked session(s).`);

    // Reset therapist stats
    const therapistResult = await db.collection('therapists').updateMany({}, {
      $set: {
        totalSessions: 0,
        averageRating: 0,
        totalReviews: 0,
        totalEarnings: 0
      }
    });
    console.log(`♻️  Reset stats for ${therapistResult.modifiedCount} therapist(s).`);

    // Reset wallets
    const walletResult = await db.collection('wallets').updateMany({}, {
      $set: {
        balance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        pendingWithdrawal: 0,
        transactions: []
      }
    });
    console.log(`♻️  Reset balances for ${walletResult.modifiedCount} wallet(s).`);

    // Clear specific billing records if they exist
    const billingResult = await db.collection('billings').deleteMany({});
    console.log(`🗑️  Deleted ${billingResult.deletedCount} billing record(s).`);

    console.log('✅ All therapist and wallet data successfully reset!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

resetData();
