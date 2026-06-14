/**
 * clearBookedSessions.js
 * Run this script to delete ALL booked session records from MongoDB.
 * Usage: node clearBookedSessions.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

async function clearBookedSessions() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const result = await mongoose.connection.db
      .collection('bookedsessions')
      .deleteMany({});

    console.log(`🗑️  Deleted ${result.deletedCount} booked session document(s).`);
    console.log('✅ Done!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

clearBookedSessions();
