const Therapist = require('../models/Therapist');
const BookedSession = require('../models/BookedSession');
const Availability = require('../models/Availability');

// helper – start/end of a day in UTC
function dayRange(date = new Date()) {
    const s = new Date(date); s.setUTCHours(0, 0, 0, 0);
    const e = new Date(date); e.setUTCHours(23, 59, 59, 999);
    return { start: s, end: e };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/therapist-dash/overview
// ─────────────────────────────────────────────────────────────────────────────
exports.getOverview = async (req, res) => {
    try {
        let profile = await Therapist.findOne({ userId: req.therapistId });
        
        // If no profile found, return skeleton data instead of 404
        if (!profile) {
            return res.json({
                success: true,
                data: {
                    profile: { fullName: req.user?.name || 'Therapist', email: req.user?.email || '', profilePhoto: '', specialties: [], sessionFee: 0, isApproved: !!req.user?.isVerified, isActive: !!req.user?.isVerified, isOnline: false, averageRating: 0, totalReviews: 0, completeness: 10 },
                    availability: null,
                    upcoming: [], todaySessions: [],
                    earnings: { today: 0, week: 0, month: 0, total: 0 },
                    stats: { completed: 0, pending: 0, cancelled: 0 },
                    chartData: Array(7).fill(0).map((_, i) => ({ label: 'N/A', count: 0 })),
                    recentReviews: [], notifications: [{ type: 'warning', msg: 'Please complete your profile configuration.' }],
                },
            });
        }

        const tId = profile._id;
        const now = new Date();

        // Upcoming sessions (next 5)
        const upcoming = await BookedSession.find({
            therapistId: tId,
            scheduledAt: { $gte: now },
            status: 'confirmed',
        }).sort({ scheduledAt: 1 }).limit(5).populate('userId', 'name email').lean();

        // Today's sessions
        const { start: todayStart, end: todayEnd } = dayRange(now);
        const todaySessions = await BookedSession.find({
            therapistId: tId,
            scheduledAt: { $gte: todayStart, $lte: todayEnd },
            status: 'confirmed',
        }).sort({ scheduledAt: 1 }).populate('userId', 'name email').lean();

        // Earnings
        const todayEarnings = await BookedSession.aggregate([
            { $match: { therapistId: tId, status: 'completed', updatedAt: { $gte: todayStart, $lte: todayEnd } } },
            { $group: { _id: null, total: { $sum: '$therapistEarning' } } },
        ]);

        const weekStart = new Date(now);
        weekStart.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
        weekStart.setUTCHours(0, 0, 0, 0);
        const weekEarnings = await BookedSession.aggregate([
            { $match: { therapistId: tId, status: 'completed', updatedAt: { $gte: weekStart } } },
            { $group: { _id: null, total: { $sum: '$therapistEarning' } } },
        ]);

        const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
        const monthEarnings = await BookedSession.aggregate([
            { $match: { therapistId: tId, status: 'completed', updatedAt: { $gte: monthStart } } },
            { $group: { _id: null, total: { $sum: '$therapistEarning' } } },
        ]);

        // Session stats
        const [completedCount, pendingCount, cancelledCount] = await Promise.all([
            BookedSession.countDocuments({ therapistId: tId, status: 'completed' }),
            BookedSession.countDocuments({ therapistId: tId, status: 'pending' }),
            BookedSession.countDocuments({ therapistId: tId, status: 'cancelled' }),
        ]);

        // Last 7 days chart
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setUTCDate(now.getUTCDate() - i);
            const { start, end } = dayRange(d);
            const count = await BookedSession.countDocuments({
                therapistId: tId, status: 'completed',
                updatedAt: { $gte: start, $lte: end },
            });
            chartData.push({ label: d.toLocaleDateString('en-IN', { weekday: 'short' }), count });
        }

        // Profile completeness
        const fields = ['fullName', 'bio', 'licenseNumber', 'specialties', 'languages', 'sessionFee', 'sessionTypes', 'profilePhoto'];
        const filled = fields.filter(f => { const v = profile[f]; return Array.isArray(v) ? v.length > 0 : !!v; });
        const completeness = Math.round((filled.length / fields.length) * 100);

        // Availability
        const avail = await Availability.findOne({ therapistId: tId });

        // Recent reviews
        const recentReviews = await BookedSession.find({
            therapistId: tId, 'review.rating': { $exists: true },
        }).sort({ 'review.createdAt': -1 }).limit(3).populate('userId', 'name').lean();

        // Notifications
        const notifications = [];
        if (!profile.onboardingComplete)
            notifications.push({ type: 'warning', msg: 'Complete your profile to start receiving bookings.' });
        if (!profile.isApproved && !req.user?.isVerified)
            notifications.push({ type: 'info', msg: 'Your profile is under review. We\'ll notify you once approved.' });
        if (!avail)
            notifications.push({ type: 'warning', msg: 'You haven\'t set your availability yet. Clients can\'t book you.' });
        if (completeness < 80)
            notifications.push({ type: 'tip', msg: `Your profile is ${completeness}% complete. Add more details to attract clients.` });

        res.json({
            success: true,
            data: {
                profile: {
                    fullName: profile.fullName, email: profile.email,
                    profilePhoto: profile.profilePhoto, specialties: profile.specialties,
                    sessionFee: profile.sessionFee, isApproved: profile.isApproved || !!req.user?.isVerified,
                    sessionTypes: profile.sessionTypes?.length ? profile.sessionTypes : ['Video', 'Chat', 'Audio'],
                    isActive: profile.isActive, isOnline: profile.isOnline,
                    averageRating: profile.averageRating,
                    totalReviews: profile.totalReviews, completeness,
                },
                availability: avail ? {
                    workStart: avail.workStart, workEnd: avail.workEnd,
                    activeDays: avail.activeDays, blockedCount: avail.blockedDates.length,
                } : null,
                upcoming, todaySessions,
                earnings: {
                    today: todayEarnings[0]?.total || 0,
                    week: weekEarnings[0]?.total || 0,
                    month: monthEarnings[0]?.total || 0,
                    total: profile.totalEarnings || 0,
                },
                stats: { completed: completedCount, pending: pendingCount, cancelled: cancelledCount },
                chartData, recentReviews, notifications,
            },
        });
    } catch (err) {
        console.error('getOverview error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/therapist-dash/sessions?status=upcoming|past&page=1
// ─────────────────────────────────────────────────────────────────────────────
exports.getSessions = async (req, res) => {
    try {
        const profile = await Therapist.findOne({ userId: req.therapistId });
        if (!profile) {
            return res.json({
                success: true, data: [],
                pagination: { total: 0, page: Number(req.query.page || 1), pages: 0 },
            });
        }

        const { status = 'upcoming', page = 1 } = req.query;
        const limit = 10;
        const skip = (Number(page) - 1) * limit;
        const now = new Date();
        let filter = { therapistId: profile._id };

        if (status === 'upcoming') {
            filter.scheduledAt = { $gte: now };
            filter.status = 'confirmed';
        } else if (status === 'past') {
            filter.$or = [
                { scheduledAt: { $lt: now } },
                { status: { $in: ['completed', 'cancelled'] } },
            ];
        }

        const [sessions, total] = await Promise.all([
            BookedSession.find(filter)
                .sort({ scheduledAt: status === 'upcoming' ? 1 : -1 })
                .skip(skip).limit(limit)
                .populate('userId', 'name email').lean(),
            BookedSession.countDocuments(filter),
        ]);

        res.json({
            success: true, data: sessions,
            pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
        });
    } catch (err) {
        console.error('getSessions error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/therapist-dash/sessions/:sessionId/confirm
// ─────────────────────────────────────────────────────────────────────────────
exports.confirmSession = async (req, res) => {
    try {
        const profile = await Therapist.findOne({ userId: req.therapistId });
        const session = await BookedSession.findOne({
            _id: req.params.sessionId, therapistId: profile._id, status: 'pending',
        });
        if (!session) return res.status(404).json({ success: false, message: 'Session not found or already confirmed.' });
        session.status = 'confirmed';
        await session.save();
        res.json({ success: true, message: 'Session confirmed.', data: session });
    } catch (err) {
        console.error('confirmSession error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/therapist-dash/earnings?period=week|month|year
// ─────────────────────────────────────────────────────────────────────────────
exports.getEarnings = async (req, res) => {
    try {
        const profile = await Therapist.findOne({ userId: req.therapistId });
        if (!profile) {
            return res.json({
                success: true,
                data: { period: req.query.period || 'month', periodStart: new Date(), totalInPeriod: 0, allTimeTotal: 0, daily: [] },
            });
        }

        const { period = 'month' } = req.query;
        const now = new Date();
        let periodStart;
        if (period === 'week') periodStart = new Date(now.setUTCDate(now.getUTCDate() - 7));
        else if (period === 'year') periodStart = new Date(now.getUTCFullYear(), 0, 1);
        else periodStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);

        const daily = await BookedSession.aggregate([
            { $match: { therapistId: profile._id, status: 'completed', updatedAt: { $gte: periodStart } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }, earnings: { $sum: '$therapistEarning' }, sessions: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);

        res.json({
            success: true,
            data: {
                period, periodStart,
                totalInPeriod: daily.reduce((a, d) => a + d.earnings, 0),
                allTimeTotal: profile.totalEarnings || 0,
                daily,
            },
        });
    } catch (err) {
        console.error('getEarnings error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};