require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./src/models/Admin');

const MONGO_URI = process.env.MONGO_URI;

// ==========================================
// CHANGE YOUR ADMIN CREDENTIALS HERE
// ==========================================
const NEW_ADMIN_EMAIL = 'admin@mindora.com';
const NEW_ADMIN_PASSWORD = 'admin123';
const NEW_ADMIN_NAME = 'Super Admin';
// ==========================================

mongoose.connect(MONGO_URI).then(async () => {
  console.log('Connected to Database. Updating admin credentials...');
  
  // Hash the new password securely
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(NEW_ADMIN_PASSWORD, salt);
  
  // This will clear out old admins to make sure only your new one exists
  // (Remove the next line if you want to keep multiple admins)
  await Admin.deleteMany({});
  
  // Create the new admin
  await Admin.create({
    name: NEW_ADMIN_NAME,
    email: NEW_ADMIN_EMAIL,
    password: hashedPassword
  });

  console.log('\n✅ Admin credentials successfully updated!');
  console.log('-------------------------------------------');
  console.log(`Email:    ${NEW_ADMIN_EMAIL}`);
  console.log(`Password: ${NEW_ADMIN_PASSWORD}`);
  console.log('-------------------------------------------');
  process.exit(0);
}).catch(err => {
  console.error('Error connecting to DB:', err);
  process.exit(1);
});
