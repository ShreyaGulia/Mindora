require('dotenv').config();
const app        = require('./app');
const connectDB  = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB first, then start the server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Mindora server running on http://localhost:${PORT}`);
  });
});