const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

// All admin routes require admin auth
router.use(adminAuth);

// ── Dashboard ─────────────────────────────────────────────
router.get('/dashboard', ctrl.getDashboard);
router.get('/analytics', ctrl.getAnalytics);

// ── Therapists ────────────────────────────────────────────
router.get('/therapists', ctrl.getTherapists);
router.patch('/therapists/:id/approve', ctrl.approveTherapist);
router.patch('/therapists/:id/reject', ctrl.rejectTherapist);

// ── Users ─────────────────────────────────────────────────
router.get('/users', ctrl.getUsers);
router.patch('/users/:id/ban', ctrl.toggleUserBan);

// ── Sessions ──────────────────────────────────────────────
router.get('/sessions', ctrl.getSessions);

// ── Withdrawals ───────────────────────────────────────────
router.get('/withdrawals', ctrl.getWithdrawals);
router.patch('/withdrawals/:walletId/process', ctrl.processWithdrawal);

// ── Billing / Subscriptions ───────────────────────────────
router.get('/billing', ctrl.getBilling);

module.exports = router;