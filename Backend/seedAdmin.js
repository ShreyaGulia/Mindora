const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./src/models/Admin');

const MONGO_URI = process.env.MONGO_URI;

// ==========================================
// CHANGE YOUR ADMIN CREDENTIALS HERE
// ==========================================
const NEW_ADMIN_EMAIL = 'Admin@mindora.com';
const NEW_ADMIN_PASSWORD = 'Mindora@Admin2025';
const NEW_ADMIN_NAME = 'Shreya';
// ==========================================

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set in your .env file');
  process.exit(1);
}

mongoose.connect(MONGO_URI).then(async () => {
  console.log('✅ Connected to Database...');

  // Hash the password securely
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(NEW_ADMIN_PASSWORD, salt);

  // Check if admin already exists
  const existing = await Admin.findOne({ email: NEW_ADMIN_EMAIL });
  if (existing) {
    console.log(`\n🔄 Admin with email "${NEW_ADMIN_EMAIL}" already exists. Updating credentials...`);
    existing.name = NEW_ADMIN_NAME;
    existing.password = hashedPassword;
    await existing.save();
    console.log('✅ Admin credentials updated successfully!');
  } else {
    // Clear any old admins (comment this line out if you want multiple admins)
    await Admin.deleteMany({});

    // Create the new admin
    await Admin.create({
      name: NEW_ADMIN_NAME,
      email: NEW_ADMIN_EMAIL,
      password: hashedPassword,
    });
    console.log('\n✅ Admin created successfully!');
  }

  console.log('-------------------------------------------');
  console.log(`Name:     ${NEW_ADMIN_NAME}`);
  console.log(`Email:    ${NEW_ADMIN_EMAIL}`);
  console.log(`Password: ${NEW_ADMIN_PASSWORD}`);
  console.log('-------------------------------------------');
  console.log('⚠️  Please change your password after first login!');
  process.exit(0);

}).catch(err => {
  console.error('❌ Error connecting to DB:', err.message);
  process.exit(1);
});