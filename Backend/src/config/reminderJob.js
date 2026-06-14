const cron = require('node-cron');
const nodemailer = require('nodemailer');
const BookedSession = require('../models/BookedSession');
const User = require('../models/User');
const Therapist = require('../models/Therapist');

// ── Email transporter ──────────────────────────────────────────────────────
// Uses Gmail. In production replace with SendGrid / SES / Mailgun
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,  // add to your .env
    pass: process.env.EMAIL_PASS,  // use Gmail App Password, not your real password
  },
});

// ── Helper: send one email ─────────────────────────────────────────────────
async function sendMail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `"MindCare" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[Reminder] Email sent to ${to} — ${subject}`);
  } catch (err) {
    console.error(`[Reminder] Failed to send to ${to}:`, err.message);
  }
}

// ── Helper: format date nicely ─────────────────────────────────────────────
function fmtDate(date) {
  return new Date(date).toLocaleString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

// ── Email templates ────────────────────────────────────────────────────────
function clientReminderHtml({ clientName, therapistName, scheduledAt, sessionType, hoursLabel }) {
  return `
    <div style="font-family:Segoe UI,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)">
      <div style="background:linear-gradient(135deg,#6c63ff,#a78bfa);padding:28px 32px">
        <h1 style="color:#fff;margin:0;font-size:22px">🌿 MindCare</h1>
      </div>
      <div style="padding:28px 32px">
        <h2 style="color:#1a1a2e;font-size:20px;margin:0 0 12px">Session Reminder ⏰</h2>
        <p style="color:#555;font-size:15px;margin:0 0 20px">Hi ${clientName}, your session is coming up <strong>${hoursLabel}</strong>.</p>
        <div style="background:#f8f7ff;border-radius:12px;padding:18px 20px;margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ede9ff">
            <span style="color:#888;font-size:14px">Therapist</span>
            <span style="font-weight:600;font-size:14px">${therapistName}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ede9ff">
            <span style="color:#888;font-size:14px">Date & Time</span>
            <span style="font-weight:600;font-size:14px">${fmtDate(scheduledAt)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0">
            <span style="color:#888;font-size:14px">Session Type</span>
            <span style="font-weight:600;font-size:14px">${sessionType}</span>
          </div>
        </div>
        <p style="color:#888;font-size:13px;margin:0">Please ensure you're in a quiet, private space before your session begins.</p>
      </div>
      <div style="background:#f4f6fb;padding:16px 32px;text-align:center">
        <p style="color:#aaa;font-size:12px;margin:0">MindCare — Mental Wellness Platform</p>
      </div>
    </div>`;
}

function therapistReminderHtml({ therapistName, clientName, scheduledAt, sessionType, hoursLabel }) {
  return `
    <div style="font-family:Segoe UI,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)">
      <div style="background:linear-gradient(135deg,#6c63ff,#a78bfa);padding:28px 32px">
        <h1 style="color:#fff;margin:0;font-size:22px">🌿 MindCare</h1>
      </div>
      <div style="padding:28px 32px">
        <h2 style="color:#1a1a2e;font-size:20px;margin:0 0 12px">Upcoming Session ⏰</h2>
        <p style="color:#555;font-size:15px;margin:0 0 20px">Hi ${therapistName}, you have a session <strong>${hoursLabel}</strong>.</p>
        <div style="background:#f8f7ff;border-radius:12px;padding:18px 20px;margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ede9ff">
            <span style="color:#888;font-size:14px">Client</span>
            <span style="font-weight:600;font-size:14px">${clientName}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ede9ff">
            <span style="color:#888;font-size:14px">Date & Time</span>
            <span style="font-weight:600;font-size:14px">${fmtDate(scheduledAt)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0">
            <span style="color:#888;font-size:14px">Session Type</span>
            <span style="font-weight:600;font-size:14px">${sessionType}</span>
          </div>
        </div>
      </div>
      <div style="background:#f4f6fb;padding:16px 32px;text-align:center">
        <p style="color:#aaa;font-size:12px;margin:0">MindCare — Mental Wellness Platform</p>
      </div>
    </div>`;
}

// ── Core reminder sender ───────────────────────────────────────────────────
async function sendReminders(hoursAhead) {
  const now = new Date();
  const from = new Date(now.getTime() + (hoursAhead - 0.25) * 3600000); // -15 min window
  const to = new Date(now.getTime() + (hoursAhead + 0.25) * 3600000); // +15 min window
  const hoursLabel = hoursAhead === 24 ? 'in 24 hours' : 'in 1 hour';

  const sessions = await BookedSession.find({
    scheduledAt: { $gte: from, $lte: to },
    status: 'confirmed',
    paymentStatus: 'paid',
  })
    .populate('userId', 'name email')
    .populate('therapistId', 'fullName email');

  if (sessions.length === 0) return;

  console.log(`[Reminder] Sending ${hoursLabel} reminders for ${sessions.length} session(s)`);

  for (const session of sessions) {
    const client = session.userId;
    const therapist = session.therapistId;

    if (!client || !therapist) continue;

    // Email to client
    if (client.email) {
      await sendMail({
        to: client.email,
        subject: `⏰ Session reminder — ${hoursLabel} (MindCare)`,
        html: clientReminderHtml({
          clientName: client.name,
          therapistName: therapist.fullName,
          scheduledAt: session.scheduledAt,
          sessionType: session.sessionType,
          hoursLabel,
        }),
      });
    }

    // Email to therapist
    if (therapist.email) {
      await sendMail({
        to: therapist.email,
        subject: `⏰ Upcoming session — ${hoursLabel} (MindCare)`,
        html: therapistReminderHtml({
          therapistName: therapist.fullName,
          clientName: client.name,
          scheduledAt: session.scheduledAt,
          sessionType: session.sessionType,
          hoursLabel,
        }),
      });
    }
  }
}

// ── Schedule cron jobs ─────────────────────────────────────────────────────
// Runs every 15 minutes and checks for sessions coming up in ~24h or ~1h
function startReminderJobs() {
  // Every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      await sendReminders(24); // 24-hour reminders
      await sendReminders(1);  // 1-hour reminders
    } catch (err) {
      console.error('[Reminder] Cron error:', err.message);
    }
  });

  console.log('[Reminder] Reminder cron job started — runs every 15 minutes');
}

module.exports = { startReminderJobs };