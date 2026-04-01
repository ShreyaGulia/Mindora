const User = require('../models/User');

const FREE_DAILY_AI_LIMIT = 10;

// ── Blocks free users from Pro-only features ──
const requirePro = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        // Auto-downgrade if Pro has expired
        if (user.plan === 'pro' && user.planExpiresAt && user.planExpiresAt < new Date()) {
            user.plan = 'free';
            user.planExpiresAt = null;
            await user.save();
        }

        if (user.plan !== 'pro') {
            return res.status(403).json({
                message: 'This feature requires a Pro plan.',
                code: 'UPGRADE_REQUIRED',
                upgradeUrl: '/pricing.html'
            });
        }

        next();
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ── Checks AI message daily limit for free users ──
const checkAiLimit = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        // Pro users — no limit at all
        if (user.plan === 'pro') return next();

        const now = new Date();
        const lastReset = new Date(user.aiMessagesResetAt || 0);
        const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);

        // Reset counter if 24 hours have passed since last reset
        if (hoursSinceReset >= 24) {
            user.aiMessagesToday = 0;
            user.aiMessagesResetAt = now;
            await user.save();
        }

        if (user.aiMessagesToday >= FREE_DAILY_AI_LIMIT) {
            const resetsAt = new Date(lastReset.getTime() + 24 * 60 * 60 * 1000);
            return res.status(429).json({
                message: `You have reached your daily limit of ${FREE_DAILY_AI_LIMIT} AI messages on the free plan.`,
                code: 'AI_LIMIT_REACHED',
                used: user.aiMessagesToday,
                limit: FREE_DAILY_AI_LIMIT,
                resetsAt: resetsAt,
                upgradeUrl: '/pricing.html'
            });
        }

        // Increment counter and continue
        user.aiMessagesToday += 1;
        await user.save();

        req.aiMessagesRemaining = FREE_DAILY_AI_LIMIT - user.aiMessagesToday;
        next();

    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = { requirePro, checkAiLimit };