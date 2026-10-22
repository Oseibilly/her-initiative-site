const express = require('express');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { sendSupportInterestNotification } = require('../mailer');

const router = express.Router();

const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/support-interest', supportLimiter, async (req, res) => {
  const { name, email, message, interests = {} } = req.body || {};

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  const donating = Boolean(interests.donating);
  const sponsorship = Boolean(interests.sponsorship);
  const programmes = Boolean(interests.programmes);
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  try {
    const result = await pool.query(
      `INSERT INTO support_interests (name, email, donating, sponsorship, programmes, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         donating = EXCLUDED.donating,
         sponsorship = EXCLUDED.sponsorship,
         programmes = EXCLUDED.programmes,
         message = EXCLUDED.message,
         updated_at = now()
       RETURNING id`,
      [trimmedName, trimmedEmail, donating, sponsorship, programmes, trimmedMessage]
    );

    sendSupportInterestNotification({
      name: trimmedName,
      email: trimmedEmail,
      message: trimmedMessage,
      interests: { donating, sponsorship, programmes },
    }).catch((err) => console.error('Failed to send support interest notification email:', err));

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Support interest submission failed:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
