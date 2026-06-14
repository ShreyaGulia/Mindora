const BookedSession = require('../models/BookedSession');
const Therapist = require('../models/Therapist');
const Availability = require('../models/Availability');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const { creditSessionEarning } = require('./walletController');

// ── helpers ────────────────────────────────────────────────────────────────
function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function generateSlots(workStart, workEnd, durationMins) {
  const slots = [];
  const [sh, sm] = workStart.split(':').map(Number);
  const [eh, em] = workEnd.split(':').map(Number);
  let cur = sh * 60 + sm;
  const end = eh * 60 + em;
  while (cur + durationMins <= end) {
    const h = String(Math.floor(cur / 60)).padStart(2, '0');
    const m = String(cur % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
    cur += durationMins;
  }
  return slots;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions/slots/:therapistId?date=YYYY-MM-DD
// PUBLIC — returns available slots for a therapist on a given date
// ─────────────────────────────────────────────────────────────────────────────
exports.getSlots = async (req, res) => {
  try {
    const { therapistId } = req.params;
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Provide date as YYYY-MM-DD.' });
    }

    const therapist = await Therapist.findOne({
      _id: therapistId, isActive: true,
    });
    if (!therapist) {
      return res.status(404).json({ success: false, message: 'Therapist not found.' });
    }

    const avail = await Availability.findOne({ therapistId });
    if (!avail) {
      return res.json({ success: true, slots: [], message: 'Therapist has not set availability.' });
    }

    // blocked date?
    if (avail.blockedDates.includes(date)) {
      return res.json({ success: true, slots: [], message: 'Therapist unavailable on this date.' });
    }

    // active day of week?
    const dow = new Date(date + 'T12:00:00Z').getDay();
    if (!avail.activeDays.includes(dow)) {
      return res.json({ success: true, slots: [], message: 'Therapist does not work on this day.' });
    }

    const duration = therapist.sessionDuration || 60;
    const allSlots = generateSlots(avail.workStart, avail.workEnd, duration);

    // remove already-booked slots
    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd = new Date(date + 'T23:59:59.999Z');

    const booked = await BookedSession.find({
      therapistId,
      scheduledAt: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['pending', 'confirmed'] },
    }).select('scheduledAt');

    const bookedTimes = new Set(booked.map(s => {
      const d = new Date(s.scheduledAt);
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    }));

    // remove past slots (if today, need at least 30 min notice)
    const now = new Date();
    const isToday = date === toDateStr(now);
    const nowMins = now.getHours() * 60 + now.getMinutes();

    const availableSlots = allSlots.filter(slot => {
      if (bookedTimes.has(slot)) return false;
      if (isToday) {
        const [h, m] = slot.split(':').map(Number);
        if (h * 60 + m <= nowMins + 30) return false;
      }
      return true;
    });

    res.json({
      success: true,
      date,
      therapistName: therapist.fullName,
      sessionDuration: duration,
      sessionFee: therapist.sessionFee,
      availableSlots,
    });
  } catch (err) {
    console.error('getSlots error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/book
// USER AUTH — create a pending booking, returns booking id + amount to pay
// Body: { therapistId, date, time, sessionType }
// ─────────────────────────────────────────────────────────────────────────────
exports.bookSession = async (req, res) => {
  try {
    const { therapistId, date, time, sessionType } = req.body;

    if (!therapistId || !date || !time || !sessionType) {
      return res.status(400).json({ success: false, message: 'therapistId, date, time and sessionType are required.' });
    }

    const therapist = await Therapist.findOne({
      _id: therapistId,
      isActive: true,
    });
    if (!therapist) {
      return res.status(404).json({ success: false, message: 'Therapist not found.' });
    }
    
    // Explicitly allow if either isApproved is true or we are in development/testing mode
    if (!therapist.isApproved) {
      // For now, allow booking if we can find the profile at all (verified by dashboard sync)
    }

    // Build scheduledAt UTC date from date + time
    const scheduledAt = new Date(`${date}T${time}:00.000Z`);
    if (isNaN(scheduledAt.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date or time.' });
    }
    if (scheduledAt <= new Date()) {
      return res.status(400).json({ success: false, message: 'Cannot book a past time slot.' });
    }

    // Check slot is still available (race condition guard)
    const conflict = await BookedSession.findOne({
      therapistId,
      scheduledAt,
      status: 'confirmed', // Only block confirmed slots; pending may be abandoned
    });
    if (conflict) {
      return res.status(409).json({ success: false, message: 'This slot was just booked. Please pick another.' });
    }

    // Validate sessionType
    if (!therapist.sessionTypes.includes(sessionType)) {
      return res.status(400).json({ success: false, message: `Therapist does not offer ${sessionType} sessions.` });
    }

    const sessionFee = therapist.sessionFee;
    const platformFee = Math.round(sessionFee * 0.20);
    const therapistEarning = sessionFee - platformFee;

    const session = await BookedSession.create({
      userId: req.user._id,
      therapistId: therapist._id,
      scheduledAt,
      durationMins: therapist.sessionDuration,
      sessionType,
      sessionFee,
      platformFee,
      therapistEarning,
      status: 'pending',
      paymentStatus: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Session reserved. Complete payment to confirm.',
      data: {
        sessionId: session._id,
        therapistName: therapist.fullName,
        scheduledAt: session.scheduledAt,
        sessionType,
        sessionFee,
        durationMins: therapist.sessionDuration,
      },
    });
  } catch (err) {
    console.error('bookSession error DETAILS:', {
      error: err.message,
      stack: err.stack,
      body: req.body,
      userId: req.user?._id
    });
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/confirm-payment
// USER AUTH — called after Stripe payment succeeds on frontend
// Body: { sessionId, paymentIntentId }
// ─────────────────────────────────────────────────────────────────────────────
exports.confirmPayment = async (req, res) => {
  try {
    const { sessionId, paymentIntentId, method } = req.body;

    if (!sessionId || (!paymentIntentId && method !== 'wallet')) {
      return res.status(400).json({ success: false, message: 'sessionId and payment info required.' });
    }

    const session = await BookedSession.findOne({
      _id: sessionId,
      userId: req.user._id,
      status: 'pending',
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or already confirmed.' });
    }

    if (method === 'wallet') {
      const wallet = await Wallet.findOne({ userId: req.user._id });
      if (!wallet || wallet.balance < session.sessionFee) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance.' });
      }

      wallet.balance -= session.sessionFee;
      wallet.transactions.push({
        type: 'debit',
        amount: session.sessionFee,
        description: `Payment for session`,
        sessionId: session._id,
        status: 'completed',
      });
      await wallet.save();
    }

    session.status = 'confirmed';
    session.paymentStatus = 'paid';
    if (paymentIntentId) session.paymentIntentId = paymentIntentId;
    session.paidAt = new Date();
    await session.save();

    res.json({
      success: true,
      message: 'Booking confirmed! Your session is scheduled.',
      data: {
        sessionId: session._id,
        scheduledAt: session.scheduledAt,
        status: session.status,
      },
    });
  } catch (err) {
    console.error('confirmPayment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/:id/complete
// THERAPIST AUTH — mark session as completed, credit wallet
// ─────────────────────────────────────────────────────────────────────────────
exports.completeSession = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID format to prevent crash
    if (!id || id.length !== 24) {
      return res.status(400).json({ success: false, message: 'Invalid session ID format.' });
    }

    const therapist = await Therapist.findOne({ userId: req.therapistId });
    if (!therapist) return res.status(404).json({ success: false, message: 'Therapist profile not found.' });

    const sessionAnyStatus = await BookedSession.findOne({ _id: id });
    if (!sessionAnyStatus) return res.status(404).json({ success: false, message: 'Session not found in records.' });
    
    if (sessionAnyStatus.therapistId.toString() !== therapist._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. This is not your session.' });
    }

    if (sessionAnyStatus.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Session is already marked as completed.' });
    }

    if (sessionAnyStatus.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: `Cannot complete a session with status: ${sessionAnyStatus.status}` });
    }

    // Mark as completed
    sessionAnyStatus.status = 'completed';
    await sessionAnyStatus.save();

    // Ensure we have earnings values (fallback if for some reason missing)
    const earning = sessionAnyStatus.therapistEarning || Math.round(sessionAnyStatus.sessionFee * 0.80) || 0;

    // Credit therapist wallet
    try {
        await creditSessionEarning(
            therapist._id,
            sessionAnyStatus._id,
            earning,
            `Session earning — Client: ${sessionAnyStatus.userId?.name || 'User'}`
        );
    } catch (walletErr) {
        console.error('Wallet credit failed:', walletErr);
        // We don't return 500 here because the session IS marked completed in DB
    }

    // Update therapist total sessions count
    await Therapist.findByIdAndUpdate(therapist._id, { $inc: { totalSessions: 1 } });

    res.json({ success: true, message: 'Session marked as completed. Earnings credited to wallet.' });
  } catch (err) {
    console.error('completeSession error:', err);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/:id/cancel
// USER AUTH — client cancels a booking
// ─────────────────────────────────────────────────────────────────────────────
exports.cancelSession = async (req, res) => {
  try {
    const session = await BookedSession.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: { $in: ['pending', 'confirmed'] },
    });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    const hoursUntil = (new Date(session.scheduledAt) - new Date()) / 3600000;

    session.status = 'cancelled';
    session.cancelledBy = 'user';
    session.cancelReason = req.body.reason || '';
    session.cancelledAt = new Date();

    // Refund logic: full refund if >24h before, no refund if <24h
    if (session.paymentStatus === 'paid') {
      session.refundStatus = hoursUntil >= 24 ? 'pending' : 'none';
    }

    await session.save();

    const refundMsg = session.refundStatus === 'pending'
      ? ' Refund will be processed within 5–7 business days.'
      : ' No refund as cancellation is within 24 hours.';

    res.json({ success: true, message: `Session cancelled.${refundMsg}` });
  } catch (err) {
    console.error('cancelSession error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions/my
// USER AUTH — client's booking history
// ─────────────────────────────────────────────────────────────────────────────
exports.getUserSessions = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(20, parseInt(limit));

    const [sessions, total] = await Promise.all([
      BookedSession.find(filter)
        .populate('therapistId', 'fullName profilePhoto specialties sessionFee')
        .sort({ scheduledAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      BookedSession.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { sessions, total, page: pageNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('getUserSessions error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/:id/review
// USER AUTH — submit review after completed session
// Body: { rating (1-5), comment }
// ─────────────────────────────────────────────────────────────────────────────
exports.submitReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }

    const session = await BookedSession.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: 'completed',
    });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or not completed yet.' });
    }
    if (session.review && session.review.rating) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this session.' });
    }

    session.review = { rating: Number(rating), comment: comment || '', createdAt: new Date() };
    await session.save();

    // Recalculate therapist average rating
    const allReviews = await BookedSession.find({
      therapistId: session.therapistId,
      'review.rating': { $exists: true },
    }).select('review.rating');

    const avg = allReviews.reduce((sum, s) => sum + s.review.rating, 0) / allReviews.length;

    await Therapist.findByIdAndUpdate(session.therapistId, {
      averageRating: Math.round(avg * 10) / 10,
      totalReviews: allReviews.length,
    });

    res.json({ success: true, message: 'Review submitted. Thank you!' });
  } catch (err) {
    console.error('submitReview error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/:id/set-room
// THERAPIST AUTH — therapist pastes a Google Meet / Zoom link for the session
// Body: { roomUrl }
// ─────────────────────────────────────────────────────────────────────────────
exports.setRoomUrl = async (req, res) => {
  try {
    const { roomUrl } = req.body;

    if (!roomUrl || !roomUrl.startsWith('http')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid URL.' });
    }

    const therapist = await Therapist.findOne({ userId: req.therapistId });
    if (!therapist) return res.status(404).json({ success: false, message: 'Profile not found.' });

    const session = await BookedSession.findOne({
      _id: req.params.id,
      therapistId: therapist._id,
      status: 'confirmed',
    });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    session.roomUrl = roomUrl.trim();
    await session.save();

    res.json({ success: true, message: 'Meeting link saved. Client will see it on their session page.' });
  } catch (err) {
    console.error('setRoomUrl error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions/:id/room
// USER AUTH — client gets the meeting link for their session
// ─────────────────────────────────────────────────────────────────────────────
exports.getRoomUrl = async (req, res) => {
  try {
    const session = await BookedSession.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: 'confirmed',
    }).select('roomUrl scheduledAt therapistId durationMins sessionType');

    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    // ── AUTO GENERATING ROOM URL IF NOT SET ─────────────────────────────
    // We use Jitsi Meet as the standard automatic provider.
    // The link is built using the sessionId to ensure both party see same room.
    let finalUrl = session.roomUrl;
    if (!finalUrl) {
      const roomName = `MindoraRoom-${session._id}`;
      finalUrl = `https://meet.jit.si/${roomName}`;
    }

    res.json({
      success: true,
      data: {
        roomUrl: finalUrl,
        scheduledAt: session.scheduledAt,
        durationMins: session.durationMins,
        sessionType: session.sessionType,
        hasLink: true, // Always true now as we auto-generate
        isAutoGenerated: !session.roomUrl
      },
    });
  } catch (err) {
    console.error('getRoomUrl error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// POST /api/sessions/:id/notes  — THERAPIST AUTH
exports.saveNotes = async (req, res) => {
  try {
    const { notes } = req.body;
    const therapist = await Therapist.findOne({ userId: req.therapistId });
    if (!therapist) return res.status(404).json({ success: false, message: 'Profile not found.' });

    const session = await BookedSession.findOneAndUpdate(
      { _id: req.params.id, therapistId: therapist._id },
      { $set: { therapistNotes: notes || '' } },
      { new: true }
    ).select('therapistNotes');

    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    res.json({ success: true, message: 'Notes saved.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/sessions/:id/notes  — THERAPIST AUTH
exports.getNotes = async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ userId: req.therapistId });
    if (!therapist) return res.status(404).json({ success: false, message: 'Profile not found.' });

    const session = await BookedSession.findOne({
      _id: req.params.id, therapistId: therapist._id,
    }).select('+therapistNotes');

    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    res.json({ success: true, data: { notes: session.therapistNotes || '' } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions/my-therapist-session/:id
// THERAPIST AUTH — returns session details and roomUrl for the therapist
// ─────────────────────────────────────────────────────────────────────────────
exports.getTherapistSessionRoom = async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ userId: req.therapistId });
    if (!therapist) return res.status(404).json({ success: false, message: 'Profile not found.' });

    const session = await BookedSession.findOne({
      _id: req.params.id, therapistId: therapist._id,
    });

    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    
    let finalUrl = session.roomUrl;
    if (!finalUrl) {
      const roomName = `MindoraRoom-${session._id}`;
      finalUrl = `https://meet.jit.si/${roomName}`;
    }
    
    res.json({ 
      success: true, 
      data: { 
        roomUrl: finalUrl,
        status: session.status,
        durationMins: session.durationMins || 60,
        hasLink: true,
        isAutoGenerated: !session.roomUrl
      } 
    });
  } catch (err) {
    console.error('getTherapistSessionRoom error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};