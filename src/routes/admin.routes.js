const express = require('express');
const db = require('../db');
const { requireToken, requireRole } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/async.handler');
const authService = require('../services/auth.service');
const reportService = require('../services/report.service');

const router = express.Router();

// The admin area signs in with the bearer token, not the cookie
const ADMIN_ONLY = [requireToken, requireRole('admin')];

// Everyone who can sign in
router.get('/users', ADMIN_ONLY, asyncHandler(async () => {
  const result = db.users.map(authService.publicUser);
  return { result, total: result.length };
}));

// Paid orders and revenue
router.get('/reports/sales', ADMIN_ONLY, asyncHandler(async () => {
  const result = await reportService.salesSummary();
  return { result };
}));

// Has a bug on purpose: it answers 500. See src/services/report.service.js
router.get('/reports/daily', ADMIN_ONLY, asyncHandler(async () => {
  const result = await reportService.dailyReport();
  return { result };
}));

module.exports = router;
