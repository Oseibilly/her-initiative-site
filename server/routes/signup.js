const express = require('express');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { sendSignupNotification } = require('../mailer');

const router = express.Router();

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-up attempts. Please try again later.' },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/community-signup', signupLimiter, async (req, res) => {
  const { name, email, interests = {} } = req.body || {};

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  const newsletter = Boolean(interests.newsletter);
  const supportGroups = Boolean(interests.supportGroups);
  const events = Boolean(interests.events);
  const volunteering = Boolean(interests.volunteering);
  const financialSupport = Boolean(interests.financialSupport);
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  try {
    const result = await pool.query(
      `INSERT INTO community_signups
         (name, email, newsletter, support_groups, events, volunteering, financial_support)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         newsletter = EXCLUDED.newsletter,
         support_groups = EXCLUDED.support_groups,
         events = EXCLUDED.events,
         volunteering = EXCLUDED.volunteering,
         financial_support = EXCLUDED.financial_support,
         updated_at = now()
       RETURNING id`,
      [trimmedName, trimmedEmail, newsletter, supportGroups, events, volunteering, financialSupport]
    );

    sendSignupNotification({
      name: trimmedName,
      email: trimmedEmail,
      interests: { newsletter, supportGroups, events, volunteering, financialSupport },
    }).catch((err) => console.error('Failed to send signup notification email:', err));

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Signup failed:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
