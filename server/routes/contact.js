const express = require('express');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { sendContactMessageNotification } = require('../mailer');

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Please try again later.' },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_CATEGORIES = ['general', 'partnerships', 'programs', 'media'];

router.post('/contact-message', contactLimiter, async (req, res) => {
  const { name, email, category, message } = req.body || {};

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'A message is required.' });
  }
  const trimmedCategory = VALID_CATEGORIES.includes(category) ? category : 'general';

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedMessage = message.trim();

  try {
    const result = await pool.query(
      `INSERT INTO contact_messages (name, email, category, message)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [trimmedName, trimmedEmail, trimmedCategory, trimmedMessage]
    );

    sendContactMessageNotification({
      name: trimmedName,
      email: trimmedEmail,
      category: trimmedCategory,
      message: trimmedMessage,
    }).catch((err) => console.error('Failed to send contact message email:', err));

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Contact message failed:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
