const User = require('../models/User');
const Therapist = require('../models/Therapist');
const TherapistUser = require('../models/TherapistUser');
const BookedSession = require('../models/BookedSession');
const Wallet = require('../models/Wallet');
const MoodLog = require('../models/MoodLog');
const Billing = require('../models/Billing');

// ── helpers ────────────────────────────────────────────────
const dayStart = d => new Date(d.toISOString().slice(0, 10) + 'T00:00:00.000Z');
const dayEnd = d => new Date(d.toISOString().slice(0, 10) + 'T23:59:59.999Z');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard
// Master overview — all key platform stats in one call
// ─────────────────────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);

        const [
            totalUsers,
            totalTherapists,
            approvedTherapists,
            pendingTherapists,
            totalSessions,
            completedSessions,
            pendingSessions,
            cancelledSessions,
            newUsersThisMonth,
            newTherapistsThisMonth,
            sessionsThisMonth,
            revenueData,
            revenueThisMonth,
            pendingWithdrawals,
            totalSubscriptionRevenueData,
            subscriptionRevenueThisMonthData,
            recentBilling,
            recentSessions,
            recentUsers,
            pendingTherapistsList,
        ] = await Promise.all([
            User.countDocuments(),
            Therapist.countDocuments(),
            Therapist.countDocuments({ isApproved: true }),
            Therapist.countDocuments({ isApproved: false, onboardingComplete: true }),
            BookedSession.countDocuments(),
            BookedSession.countDocuments({ status: 'completed' }),
            BookedSession.countDocuments({ status: 'pending' }),
            BookedSession.countDocuments({ status: 'cancelled' }),
            User.countDocuments({ createdAt: { $gte: monthStart } }),
            Therapist.countDocuments({ createdAt: { $gte: monthStart } }),
            BookedSession.countDocuments({ createdAt: { $gte: monthStart } }),
            BookedSession.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$platformFee' } } },
            ]),
            BookedSession.aggregate([
                { $match: { status: 'completed', createdAt: { $gte: monthStart } } },
                { $group: { _id: null, total: { $sum: '$platformFee' } } },
            ]),
            Wallet.aggregate([
                { $group: { _id: null, total: { $sum: '$pendingWithdrawal' } } },
            ]),
            Billing.aggregate([
                { $match: { status: 'succeeded' } },
                { $group: { _id: null, total: { $sum: '$amountDisplay' } } },
            ]),
            Billing.aggregate([
                { $match: { status: 'succeeded', createdAt: { $gte: monthStart } } },
                { $group: { _id: null, total: { $sum: '$amountDisplay' } } },
            ]),
            Billing.find()
                .populate('user', 'name email')
                .sort({ createdAt: -1 }).limit(8).lean(),
            BookedSession.find()
                .populate('userId', 'name email')
                .populate('therapistId', 'fullName')
                .sort({ createdAt: -1 }).limit(8).lean(),
            User.find().sort({ createdAt: -1 }).limit(5).select('name email createdAt').lean(),
            Therapist.find({ isApproved: false, onboardingComplete: true })
                .sort({ createdAt: -1 }).limit(5)
                .select('fullName email specialties yearsOfExperience createdAt').lean(),
        ]);

        // Last 7 days revenue chart
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now); d.setDate(now.getDate() - i);
            const ds = dayStart(d); const de = dayEnd(d);
            const r = await BookedSession.aggregate([
                { $match: { status: 'completed', createdAt: { $gte: ds, $lte: de } } },
                { $group: { _id: null, revenue: { $sum: '$platformFee' }, sessions: { $sum: 1 } } },
            ]);
            chartData.push({
                label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
                revenue: r[0]?.revenue || 0,
                sessions: r[0]?.sessions || 0,
            });
        }

        res.json({
            success: true,
            data: {
                stats: {
                    totalUsers,
                    totalTherapists,
                    approvedTherapists,
                    pendingTherapists,
                    totalSessions,
                    completedSessions,
                    pendingSessions,
                    cancelledSessions,
                    newUsersThisMonth,
                    newTherapistsThisMonth,
                    sessionsThisMonth,
                    totalRevenue: revenueData[0]?.total || 0,
                    revenueThisMonth: revenueThisMonth[0]?.total || 0,
                    pendingWithdrawals: pendingWithdrawals[0]?.total || 0,
                    totalSubscriptionRevenue: totalSubscriptionRevenueData[0]?.total || 0,
                    subscriptionRevenueThisMonth: subscriptionRevenueThisMonthData[0]?.total || 0,
                },
                recentSessions,
                recentBilling,
                recentUsers,
                pendingTherapistsList,
                chartData,
            },
        });
    } catch (err) {
        console.error('getDashboard error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/therapists
// List all therapists with filters
// Query: status=pending|approved|all, page, limit, search
// ─────────────────────────────────────────────────────────────────────────────
exports.getTherapists = async (req, res) => {
    try {
        const { status = 'all', page = 1, limit = 15, search = '' } = req.query;
        const filter = {};
        if (status === 'pending') { filter.isApproved = false; filter.onboardingComplete = true; }
        if (status === 'approved') { filter.isApproved = true; }
        if (search.trim()) {
            filter.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, parseInt(limit));

        const [therapists, total] = await Promise.all([
            Therapist.find(filter)
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum).limit(limitNum)
                .select('fullName email phone gender profilePhoto bio specialties yearsOfExperience education licenseNumber licenseDocument languages sessionFee sessionDuration isApproved isActive onboardingComplete totalSessions averageRating totalEarnings bankAccountName bankAccountNumber bankIFSC upiId createdAt')
                .lean(),
            Therapist.countDocuments(filter),
        ]);

        res.json({ success: true, data: { therapists, total, page: pageNum, pages: Math.ceil(total / limitNum) } });
    } catch (err) {
        console.error('getTherapists error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/therapists/:id/approve
// Approve a therapist
// ─────────────────────────────────────────────────────────────────────────────
exports.approveTherapist = async (req, res) => {
    try {
        const therapist = await Therapist.findByIdAndUpdate(
            req.params.id,
            { isApproved: true, isActive: true },
            { new: true }
        ).select('fullName email isApproved userId');

        if (!therapist) return res.status(404).json({ success: false, message: 'Therapist not found.' });

        // Also mark the TherapistUser login record as verified so they can log in
        if (therapist.userId) {
            await TherapistUser.findByIdAndUpdate(therapist.userId, { isVerified: true });
        }

        res.json({ success: true, message: `${therapist.fullName} has been approved and is now live.`, data: therapist });
    } catch (err) {
        console.error('approveTherapist error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/therapists/:id/reject
// Reject / suspend a therapist
// Body: { reason }
// ─────────────────────────────────────────────────────────────────────────────
exports.rejectTherapist = async (req, res) => {
    try {
        const therapist = await Therapist.findByIdAndDelete(req.params.id).select('fullName email userId');

        if (!therapist) return res.status(404).json({ success: false, message: 'Therapist not found.' });

        // Remove login access completely
        if (therapist.userId) {
            await TherapistUser.findByIdAndDelete(therapist.userId);
        }

        res.json({ success: true, message: `${therapist.fullName} has been removed from the platform.` });
    } catch (err) {
        console.error('rejectTherapist error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users
// List all users
// ─────────────────────────────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 15, search = '' } = req.query;
        const filter = {};
        if (search.trim()) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, parseInt(limit));

        const [users, total] = await Promise.all([
            User.find(filter)
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum).limit(limitNum)
                .select('name email createdAt isActive')
                .lean(),
            User.countDocuments(filter),
        ]);

        // Attach session counts
        const userIds = users.map(u => u._id);
        const sessionCounts = await BookedSession.aggregate([
            { $match: { userId: { $in: userIds } } },
            { $group: { _id: '$userId', count: { $sum: 1 } } },
        ]);
        const countMap = Object.fromEntries(sessionCounts.map(s => [s._id.toString(), s.count]));
        const usersWithCount = users.map(u => ({ ...u, sessionCount: countMap[u._id.toString()] || 0 }));

        res.json({ success: true, data: { users: usersWithCount, total, page: pageNum, pages: Math.ceil(total / limitNum) } });
    } catch (err) {
        console.error('getUsers error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/ban
// Ban or unban a user
// ─────────────────────────────────────────────────────────────────────────────
exports.toggleUserBan = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id).select('name');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        res.json({
            success: true,
            message: `${user.name} has been banned and removed.`,
            isActive: false,
        });
    } catch (err) {
        console.error('toggleUserBan error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/sessions
// All sessions with filters
// ─────────────────────────────────────────────────────────────────────────────
exports.getSessions = async (req, res) => {
    try {
        const { status = 'all', page = 1, limit = 15 } = req.query;
        const filter = {};
        if (status !== 'all') filter.status = status;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, parseInt(limit));

        const [sessions, total] = await Promise.all([
            BookedSession.find(filter)
                .populate('userId', 'name email')
                .populate('therapistId', 'fullName')
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum).limit(limitNum)
                .lean(),
            BookedSession.countDocuments(filter),
        ]);

        res.json({ success: true, data: { sessions, total, page: pageNum, pages: Math.ceil(total / limitNum) } });
    } catch (err) {
        console.error('getSessions error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/withdrawals
// All pending withdrawal requests
// ─────────────────────────────────────────────────────────────────────────────
exports.getWithdrawals = async (req, res) => {
    try {
        const wallets = await Wallet.find({ pendingWithdrawal: { $gt: 0 } })
            .populate('therapistId', 'fullName email')
            .lean();

        const requests = wallets.map(w => {
            const pendingTxns = w.transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending');
            return {
                walletId: w._id,
                therapist: w.therapistId,
                balance: w.balance,
                pending: w.pendingWithdrawal,
                upiId: w.upiId,
                bankLast4: w.bankAccountNumber ? w.bankAccountNumber.slice(-4) : null,
                method: w.payoutMethod,
                requests: pendingTxns,
            };
        });

        res.json({ success: true, data: requests });
    } catch (err) {
        console.error('getWithdrawals error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/withdrawals/:walletId/process
// Mark a withdrawal as processed (after manual bank transfer)
// ─────────────────────────────────────────────────────────────────────────────
exports.processWithdrawal = async (req, res) => {
    try {
        const wallet = await Wallet.findById(req.params.walletId);
        if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found.' });

        const amount = wallet.pendingWithdrawal;

        // Mark all pending withdrawal txns as completed
        wallet.transactions.forEach(t => {
            if (t.type === 'withdrawal' && t.status === 'pending') {
                t.status = 'completed';
                t.description = t.description.replace('pending processing', 'processed by admin');
            }
        });

        wallet.totalWithdrawn += amount;
        wallet.pendingWithdrawal = 0;
        await wallet.save();

        res.json({ success: true, message: `Withdrawal of ₹${amount} marked as processed.` });
    } catch (err) {
        console.error('processWithdrawal error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/analytics
// Detailed platform analytics
// ─────────────────────────────────────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
    try {
        const now = new Date();

        // Last 30 days daily revenue
        const daily = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now); d.setDate(now.getDate() - i);
            const ds = dayStart(d); const de = dayEnd(d);
            const r = await BookedSession.aggregate([
                { $match: { status: 'completed', createdAt: { $gte: ds, $lte: de } } },
                { $group: { _id: null, revenue: { $sum: '$platformFee' }, sessions: { $sum: 1 } } },
            ]);
            daily.push({
                date: ds.toISOString().slice(0, 10),
                label: `${d.getDate()}/${d.getMonth() + 1}`,
                revenue: r[0]?.revenue || 0,
                sessions: r[0]?.sessions || 0,
            });
        }

        // Top therapists by sessions
        const topTherapists = await BookedSession.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: '$therapistId', sessions: { $sum: 1 }, revenue: { $sum: '$therapistEarning' } } },
            { $sort: { sessions: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'therapists', localField: '_id', foreignField: '_id', as: 'therapist' } },
            { $unwind: '$therapist' },
            { $project: { name: '$therapist.fullName', sessions: 1, revenue: 1 } },
        ]);

        // Session type breakdown
        const sessionTypes = await BookedSession.aggregate([
            { $group: { _id: '$sessionType', count: { $sum: 1 } } },
        ]);

        // Specialty demand
        const specialtyDemand = await BookedSession.aggregate([
            { $lookup: { from: 'therapists', localField: 'therapistId', foreignField: '_id', as: 'therapist' } },
            { $unwind: '$therapist' },
            { $unwind: '$therapist.specialties' },
            { $group: { _id: '$therapist.specialties', count: { $sum: 1 } } },
            { $sort: { count: -1 } }, { $limit: 8 },
        ]);

        res.json({ success: true, data: { daily, topTherapists, sessionTypes, specialtyDemand } });
    } catch (err) {
        console.error('getAnalytics error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/billing
// All billing transactions with filtering
// ─────────────────────────────────────────────────────────────────────────────
exports.getBilling = async (req, res) => {
    try {
        const { status = 'all', page = 1, limit = 15 } = req.query;
        const filter = {};
        if (status !== 'all') filter.status = status;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, parseInt(limit));

        const [billings, total] = await Promise.all([
            Billing.find(filter)
                .populate('user', 'name email')
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum).limit(limitNum)
                .lean(),
            Billing.countDocuments(filter),
        ]);

        res.json({ success: true, data: { billings, total, page: pageNum, pages: Math.ceil(total / limitNum) } });
    } catch (err) {
        console.error('getBilling error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};