const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createPaymentIntent,
    confirmPayment,
    handleWebhook,
    getBillingHistory,
    getPlanStatus
} = require('../controllers/paymentController');

// Webhook — NO auth middleware, Stripe sends its own signature
// Must be first so app.js raw-body middleware runs before express.json
router.post('/webhook', handleWebhook);

// All other payment routes require user to be logged in
router.post('/create-intent', protect, createPaymentIntent);
router.post('/confirm', protect, confirmPayment);
router.get('/billing-history', protect, getBillingHistory);
router.get('/plan-status', protect, getPlanStatus);

module.exports = router;