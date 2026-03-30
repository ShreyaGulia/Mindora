require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./db');
const Admin = require('../models/Admin');

const seedAdmin = async () => {
    await connectDB();
    await Admin.deleteMany();

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('Shreya15052005', salt);

    await Admin.create({
        name: 'Mindora Admin',
        email: 'shreya10109@gmail.com',
        password: 'Shreya15052005'
    });

    console.log('Admin seeded: shreya10109@gmail.com / Shreya15052005');
    process.exit();
};

seedAdmin();