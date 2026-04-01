const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Billing = require('../models/Billing');

// ─────────────────────────────────────────────────
// Helper — get or create a Stripe customer for this user
// ─────────────────────────────────────────────────
const getOrCreateStripeCustomer = async (user) => {
    if (user.stripeCustomerId) {
        return user.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() }
    });

    user.stripeCustomerId = customer.id;
    await user.save();

    return customer.id;
};

// ─────────────────────────────────────────────────
// POST /api/payment/create-intent
// Creates a Stripe PaymentIntent — frontend uses the
// client_secret to complete payment with Stripe.js
// ─────────────────────────────────────────────────
const createPaymentIntent = async (req, res) => {
    try {
        const { amount, purpose } = req.body;

        const validPurposes = ['wallet_topup', 'pro_monthly', 'pro_yearly'];
        if (!validPurposes.includes(purpose)) {
            return res.status(400).json({ message: 'Invalid payment purpose' });
        }

        const amountNum = Number(amount);
        if (!amountNum || amountNum < 10) {
            return res.status(400).json({ message: 'Minimum amount is ₹10' });
        }

        // Stripe uses smallest currency unit — paise for INR (₹1 = 100 paise)
        const amountInPaise = Math.round(amountNum * 100);

        const user = await User.findById(req.user.id);
        const customerId = await getOrCreateStripeCustomer(user);

        // Create PaymentIntent on Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInPaise,
            currency: 'inr',
            customer: customerId,
            metadata: {
                userId: req.user.id,
                purpose: purpose
            },
            description: `Mindora — ${purpose.replace('_', ' ')}`
        });

        // Save a pending billing record in our DB
        const billing = await Billing.create({
            user: req.user.id,
            stripePaymentIntentId: paymentIntent.id,
            stripeCustomerId: customerId,
            amount: amountInPaise,
            amountDisplay: amountNum,
            purpose,
            status: 'pending'
        });

        // Return the client_secret to the frontend
        // Frontend uses this with Stripe.js to show the payment form
        res.json({
            clientSecret: paymentIntent.client_secret,
            billingId: billing._id,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
        });

    } catch (err) {
        console.error('Stripe create-intent error:', err);
        res.status(500).json({ message: 'Payment initiation failed', error: err.message });
    }
};

// ─────────────────────────────────────────────────
// POST /api/payment/confirm
// Called from frontend AFTER Stripe confirms the payment
// Updates our DB and fulfills the purchase
// ─────────────────────────────────────────────────
const confirmPayment = async (req, res) => {
    try {
        const { paymentIntentId, billingId, purpose } = req.body;

        // Verify the payment actually succeeded with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({
                message: `Payment not successful. Status: ${paymentIntent.status}`
            });
        }

        // Update billing record
        await Billing.findByIdAndUpdate(billingId, {
            stripePaymentIntentId: paymentIntentId,
            status: 'succeeded'
        });

        const user = await User.findById(req.user.id);
        const amountDisplay = paymentIntent.amount / 100; // convert paise back to rupees

        // ── Fulfill based on purpose ──

        if (purpose === 'wallet_topup') {
            let wallet = await Wallet.findOne({ user: req.user.id });
            if (!wallet) wallet = await Wallet.create({ user: req.user.id, balance: 0 });

            wallet.balance += amountDisplay;
            wallet.transactions.push({
                type: 'credit',
                amount: amountDisplay,
                description: `Stripe top-up — ${paymentIntentId}`
            });
            await wallet.save();

            return res.json({
                message: `₹${amountDisplay} added to your wallet`,
                newBalance: wallet.balance,
                purpose
            });
        }

        if (purpose === 'pro_monthly') {
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            user.plan = 'pro';
            user.planExpiresAt = expiresAt;
            await user.save();

            return res.json({
                message: 'You are now on the Pro plan! Valid for 30 days.',
                plan: 'pro',
                expiresAt: expiresAt,
                purpose
            });
        }

        if (purpose === 'pro_yearly') {
            const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            user.plan = 'pro';
            user.planExpiresAt = expiresAt;
            await user.save();

            return res.json({
                message: 'You are now on the Pro plan! Valid for 1 year.',
                plan: 'pro',
                expiresAt: expiresAt,
                purpose
            });
        }

    } catch (err) {
        console.error('Stripe confirm error:', err);
        res.status(500).json({ message: 'Payment confirmation failed', error: err.message });
    }
};

// ─────────────────────────────────────────────────
// POST /api/payment/webhook
// Stripe calls this automatically on payment events
// This is the backup in case frontend confirm call fails
// IMPORTANT: needs raw body — handled in app.js
// ─────────────────────────────────────────────────
const handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Verify the event came from Stripe using the webhook secret
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ message: `Webhook error: ${err.message}` });
    }

    // Handle payment_intent.succeeded event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { userId, purpose } = paymentIntent.metadata;

        // Find our billing record
        const billing = await Billing.findOne({
            stripePaymentIntentId: paymentIntent.id
        });

        if (!billing || billing.status === 'succeeded') {
            // Already processed — skip
            return res.json({ received: true });
        }

        // Update billing status
        await Billing.findByIdAndUpdate(billing._id, { status: 'succeeded' });

        const amountDisplay = paymentIntent.amount / 100;

        if (purpose === 'wallet_topup') {
            let wallet = await Wallet.findOne({ user: userId });
            if (!wallet) wallet = await Wallet.create({ user: userId, balance: 0 });

            wallet.balance += amountDisplay;
            wallet.transactions.push({
                type: 'credit',
                amount: amountDisplay,
                description: `Stripe top-up (webhook) — ${paymentIntent.id}`
            });
            await wallet.save();
        }

        if (purpose === 'pro_monthly') {
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            await User.findByIdAndUpdate(userId, { plan: 'pro', planExpiresAt: expiresAt });
        }

        if (purpose === 'pro_yearly') {
            const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            await User.findByIdAndUpdate(userId, { plan: 'pro', planExpiresAt: expiresAt });
        }

        console.log(`Webhook fulfilled: ${purpose} for user ${userId}`);
    }

    // Handle payment_intent.payment_failed event
    if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        await Billing.findOneAndUpdate(
            { stripePaymentIntentId: paymentIntent.id },
            { status: 'failed' }
        );
        console.log(`Payment failed: ${paymentIntent.id}`);
    }

    res.json({ received: true });
};

// ─────────────────────────────────────────────────
// GET /api/payment/billing-history
// ─────────────────────────────────────────────────
const getBillingHistory = async (req, res) => {
    try {
        const bills = await Billing.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(20);

        res.json(bills);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ─────────────────────────────────────────────────
// GET /api/payment/plan-status
// ─────────────────────────────────────────────────
const getPlanStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('plan planExpiresAt name email aiMessagesToday');

        // Auto-downgrade if Pro has expired
        if (user.plan === 'pro' && user.planExpiresAt && user.planExpiresAt < new Date()) {
            user.plan = 'free';
            user.planExpiresAt = null;
            await user.save();
        }

        const FREE_LIMIT = 10;

        res.json({
            plan: user.plan,
            planExpiresAt: user.planExpiresAt,
            name: user.name,
            email: user.email,
            aiMessagesToday: user.aiMessagesToday,
            aiMessagesLimit: FREE_LIMIT,
            aiMessagesLeft: user.plan === 'pro' ? 'unlimited' : Math.max(0, FREE_LIMIT - user.aiMessagesToday)
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = {
    createPaymentIntent,
    confirmPayment,
    handleWebhook,
    getBillingHistory,
    getPlanStatus
};