require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db');
const Therapist = require('../models/Therapist');

const therapists = [
  {
    name: 'Dr. Asha Verma',
    role: 'Clinical Psychologist',
    institution: 'NIMHANS, Bengaluru',
    quote: 'I believe healing starts when you feel truly heard.',
    experience: '5+ years',
    mode: 'Online',
    languages: ['English', 'Hindi'],
    tags: ['Anxiety', 'Stress', 'Depression', 'CBT'],
    rating: 4.9, reviewCount: 98,
    color: 'green',
    pricePerMin: 2, sessionFee: 299,
    isVerified: true
  },
  {
    name: 'Dr. Rohan Mehta',
    role: 'Psychotherapist',
    institution: 'TISS, Mumbai',
    quote: 'Burnout and overthinking are signs, not flaws.',
    experience: '7+ years',
    mode: 'Online / Offline',
    languages: ['English', 'Hindi', 'Marathi'],
    tags: ['Overthinking', 'Burnout', 'Self-esteem', 'DBT'],
    rating: 4.8, reviewCount: 134,
    color: 'purple',
    pricePerMin: 3, sessionFee: 399,
    isVerified: true
  },
  {
    name: 'Dr. Neha Sharma',
    role: 'Counseling Psychologist',
    institution: 'Delhi University',
    quote: 'Sleep and emotional wellbeing are deeply connected.',
    experience: '4+ years',
    mode: 'Online',
    languages: ['English', 'Hindi', 'Punjabi'],
    tags: ['Sleep Issues', 'Stress', 'Emotional Healing', 'Mindfulness'],
    rating: 4.9, reviewCount: 112,
    color: 'blue',
    pricePerMin: 2, sessionFee: 249,
    isVerified: true
  }
];

const seed = async () => {
  await connectDB();
  await Therapist.deleteMany();                 // clear existing
  await Therapist.insertMany(therapists);
  console.log('Therapists seeded successfully');
  process.exit();
};

seed();