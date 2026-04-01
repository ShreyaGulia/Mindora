require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(async () => {
     console.log("Connected to MongoDB.");
     const users = await User.find({ plan: 'pro' }).select('email plan stripeCustomerId').lean();
     if(users.length > 0) {
         console.log("Users with Pro plan:", users);
     } else {
         console.log("No users found with a Pro plan.");
         
         // Let's also check the latest user's plan just in case
         const latestUser = await User.findOne().sort({ createdAt: -1 }).select('email plan stripeCustomerId').lean();
         console.log("Latest created user:", latestUser);
     }
     mongoose.disconnect();
  })
  .catch(err => console.error(err));
