const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const app = express();

// Allow your frontend origin to call this backend
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],  // your frontend Live Server URL
  credentials: true
}));

// Parse incoming JSON request bodies
app.use(express.json());

// Log every request to the console during development
app.use(morgan('dev'));

// Health check route — visit http://localhost:5000/api/health to confirm server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mindora API is running' });
});

module.exports = app;