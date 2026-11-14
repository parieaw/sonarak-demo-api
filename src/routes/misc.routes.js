const express = require('express');
const config = require('../config');
const db = require('../db');
const messages = require('../utils/messages');

const router = express.Router();

// Is the server up
router.get('/health', (req, res) => {
  res.json({ ok: true, uptime: Math.round(process.uptime()), version: '1.0.0' });
});

// A plain HTML form posts here: application/x-www-form-urlencoded, no sign-in
router.post('/feedback', express.urlencoded({ extended: false }), (req, res) => {
  const { name, message, rating } = req.body;
  if (!message) {
    return res.status(400).json({ status: false, msg: 'MESSAGE_REQUIRED' });
  }
  const entry = { id: db.feedback.length + 1, name: name || 'anonymous', message, rating: Number(rating) || null };
  db.feedback.push(entry);
  res.status(201).json({ status: true, result: entry });
});

// The payment provider calls this with its key in x-api-key
router.post('/webhooks/payment', (req, res) => {
  if (!config.paymentApiKey) {
    return res.status(500).json({ status: false, msg: messages.PAYMENT_KEY_NOT_CONFIGURED });
  }
  if (req.headers['x-api-key'] !== config.paymentApiKey) {
    return res.status(401).json({ status: false, msg: messages.WRONG_API_KEY });
  }
  const order = db.orders.find((o) => o.id === req.body.orderId);
  if (!order) {
    return res.status(404).json({ status: false, msg: messages.ORDER_NOT_FOUND });
  }
  order.status = 'paid';
  res.json({ status: true, result: { id: order.id, status: order.status } });
});

module.exports = router;
