require('dotenv').config();
const mongoose = require('mongoose');

const dropIndex = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const Therapist = mongoose.model('Therapist', new mongoose.Schema({}, { strict: false }));
        
        console.log('Fetching indexes for therapists collection...');
        const indexes = await Therapist.collection.getIndexes();
        console.log('Current indexes:', Object.keys(indexes));

        // Let's identify the problematic one. 
        // It's likely named specialties_1_languages_1_isApproved_1_isActive_1
        const badIndexName = 'specialties_1_languages_1_isApproved_1_isActive_1';
        
        if (indexes[badIndexName]) {
            console.log(`Dropping index: ${badIndexName}...`);
            await Therapist.collection.dropIndex(badIndexName);
            console.log('Successfully dropped the parallel array index.');
        } else {
            console.log('Bad index not found by exact name. Checking for similar patterns...');
            // In case it has a different name
            for (const key of Object.keys(indexes)) {
                if (key.includes('specialties') && key.includes('languages')) {
                    console.log(`Found likely culprit: ${key}. Dropping it...`);
                    await Therapist.collection.dropIndex(key);
                    console.log(`Dropped index: ${key}`);
                }
            }
        }

        console.log('Done cleaning up indexes.');
        process.exit(0);
    } catch (err) {
        console.error('Error dropping index:', err);
        process.exit(1);
    }
};

dropIndex();
