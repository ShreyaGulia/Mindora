const Availability = require('../models/Availability');
const Therapist = require('../models/Therapist');
const BookedSession = require('../models/BookedSession');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: generate time slots for a given date
// e.g. workStart=10:00, workEnd=18:00, duration=60 → ["10:00","11:00",..."17:00"]
// ─────────────────────────────────────────────────────────────────────────────
function generateSlots(workStart, workEnd, durationMins) {
    const slots = [];
    const [startH, startM] = workStart.split(':').map(Number);
    const [endH, endM] = workEnd.split(':').map(Number);

    let cur = startH * 60 + startM;          // current time in minutes
    const end = endH * 60 + endM;            // end time in minutes

    while (cur + durationMins <= end) {
        const h = String(Math.floor(cur / 60)).padStart(2, '0');
        const m = String(cur % 60).padStart(2, '0');
        slots.push(`${h}:${m}`);
        cur += durationMins;
    }
    return slots;
}

// Format a Date as "YYYY-MM-DD"
function toDateStr(date) {
    return date.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/therapist/availability
// Returns therapist's saved availability settings
// ─────────────────────────────────────────────────────────────────────────────
exports.getAvailability = async (req, res) => {
    try {
        const profile = await Therapist.findOne({ userId: req.therapistId });
        
        let therapistId = profile ? profile._id : null;
        let avail = therapistId ? await Availability.findOne({ therapistId }) : null;

        // If no profile found or no availability set, return defaults
        if (!avail) {
            return res.json({
                success: true,
                data: {
                    workStart: '10:00',
                    workEnd: '18:00',
                    activeDays: [1, 2, 3, 4, 5],
                    blockedDates: [],
                }
            });
        }

        res.json({ success: true, data: avail });
    } catch (err) {
        console.error('getAvailability error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/therapist/availability
// Save/update working hours and active days
// Body: { workStart, workEnd, activeDays }
// ─────────────────────────────────────────────────────────────────────────────
exports.saveAvailability = async (req, res) => {
    try {
        const { workStart, workEnd, activeDays } = req.body;

        // Validation
        const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
        if (!timeRe.test(workStart) || !timeRe.test(workEnd)) {
            return res.status(400).json({ success: false, message: 'Invalid time format. Use HH:MM (24h).' });
        }

        const [sh, sm] = workStart.split(':').map(Number);
        const [eh, em] = workEnd.split(':').map(Number);
        if (sh * 60 + sm >= eh * 60 + em) {
            return res.status(400).json({ success: false, message: 'End time must be after start time.' });
        }

        if (!Array.isArray(activeDays) || activeDays.length === 0) {
            return res.status(400).json({ success: false, message: 'Select at least one active day.' });
        }

        // Ensure a therapist profile exists (auto-create if missing)
        const profile = await Therapist.findOneAndUpdate(
            { userId: req.therapistId },
            { 
                $setOnInsert: { 
                    userId: req.therapistId, 
                    email: req.user?.email || '', 
                    fullName: req.user?.name || 'Therapist',
                    sessionFee: 500,
                    sessionTypes: ['Video', 'Chat', 'Audio'],
                    isApproved: !!req.user?.isVerified
                } 
            },
            { upsert: true, new: true }
        );

        const avail = await Availability.findOneAndUpdate(
            { therapistId: profile._id },
            { therapistId: profile._id, workStart, workEnd, activeDays },
            { new: true, upsert: true, runValidators: true }
        );

        res.json({ success: true, message: 'Availability saved.', data: avail });
    } catch (err) {
        console.error('saveAvailability error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/therapist/availability/block
// Toggle a date as blocked or unblocked
// Body: { date: "YYYY-MM-DD" }
// ─────────────────────────────────────────────────────────────────────────────
exports.toggleBlockDate = async (req, res) => {
    try {
        const { date } = req.body;

        const dateRe = /^\d{4}-\d{2}-\d{2}$/;
        if (!date || !dateRe.test(date)) {
            return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' });
        }

        // Cannot block past dates
        if (date < toDateStr(new Date())) {
            return res.status(400).json({ success: false, message: 'Cannot block past dates.' });
        }

        const profile = await Therapist.findOne({ userId: req.therapistId });
        if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });

        let avail = await Availability.findOne({ therapistId: profile._id });
        if (!avail) {
            avail = new Availability({ therapistId: profile._id });
        }

        const isBlocked = avail.blockedDates.includes(date);

        if (isBlocked) {
            // Unblock
            avail.blockedDates = avail.blockedDates.filter(d => d !== date);
        } else {
            // Block — also check no bookings exist on that date
            const dayStart = new Date(date + 'T00:00:00.000Z');
            const dayEnd = new Date(date + 'T23:59:59.999Z');
            const existingBookings = await BookedSession.countDocuments({
                therapistId: profile._id,
                scheduledAt: { $gte: dayStart, $lte: dayEnd },
                status: { $in: ['pending', 'confirmed'] },
            });

            if (existingBookings > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot block ${date} — there are ${existingBookings} active booking(s) on this day.`,
                });
            }

            avail.blockedDates.push(date);
        }

        await avail.save();

        res.json({
            success: true,
            message: isBlocked ? `${date} unblocked.` : `${date} blocked.`,
            blocked: !isBlocked,
            blockedDates: avail.blockedDates,
        });
    } catch (err) {
        console.error('toggleBlockDate error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/availability/:therapistId/slots?date=YYYY-MM-DD
// PUBLIC — used by clients to see available slots for a specific date
// ─────────────────────────────────────────────────────────────────────────────
exports.getAvailableSlots = async (req, res) => {
    try {
        const { therapistId } = req.params;
        const { date } = req.query;

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ success: false, message: 'Provide date as YYYY-MM-DD.' });
        }

        // Get therapist profile (for session duration)
        const profile = await Therapist.findById(therapistId);
        if (!profile) return res.status(404).json({ success: false, message: 'Therapist not found.' });

        // Get availability settings
        const avail = await Availability.findOne({ therapistId });
        if (!avail) {
            return res.json({ success: true, slots: [], message: 'Therapist has not set availability yet.' });
        }

        // Check if date is blocked
        if (avail.blockedDates.includes(date)) {
            return res.json({ success: true, slots: [], message: 'Therapist is unavailable on this date.' });
        }

        // Check if day of week is active (0=Sun…6=Sat)
        const dayOfWeek = new Date(date + 'T12:00:00Z').getDay();
        if (!avail.activeDays.includes(dayOfWeek)) {
            return res.json({ success: true, slots: [], message: 'Therapist does not work on this day.' });
        }

        // Generate all possible slots
        const duration = profile.sessionDuration || 60;
        const allSlots = generateSlots(avail.workStart, avail.workEnd, duration);

        // Find already-booked slots for this date
        const dayStart = new Date(date + 'T00:00:00.000Z');
        const dayEnd = new Date(date + 'T23:59:59.999Z');

        const bookedSessions = await BookedSession.find({
            therapistId,
            scheduledAt: { $gte: dayStart, $lte: dayEnd },
            status: { $in: ['pending', 'confirmed'] },
        }).select('scheduledAt');

        // Extract booked times as "HH:MM"
        const bookedTimes = new Set(
            bookedSessions.map(s => {
                const d = new Date(s.scheduledAt);
                return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
            })
        );

        // Filter out booked and past slots
        const now = new Date();
        const isToday = date === toDateStr(now);
        const nowMins = now.getHours() * 60 + now.getMinutes();

        const availableSlots = allSlots.filter(slot => {
            if (bookedTimes.has(slot)) return false;
            if (isToday) {
                const [h, m] = slot.split(':').map(Number);
                if (h * 60 + m <= nowMins + 30) return false; // need at least 30 min notice
            }
            return true;
        });

        res.json({
            success: true,
            date,
            therapistName: profile.fullName,
            sessionDuration: duration,
            totalSlots: allSlots.length,
            availableSlots,
        });
    } catch (err) {
        console.error('getAvailableSlots error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};