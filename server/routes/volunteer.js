const express = require('express');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { sendVolunteerApplicationNotification } = require('../mailer');

const router = express.Router();

const volunteerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many applications. Please try again later.' },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OPPORTUNITY_KEYS = [
  'communityOutreach',
  'research',
  'communications',
  'graphicDesign',
  'socialMedia',
  'events',
  'administration',
  'fundraising',
  'photographyVideography',
  'healthEducation',
  'projectManagement',
];

const OPPORTUNITY_LABELS = {
  communityOutreach: 'Community Outreach',
  research: 'Research',
  communications: 'Communications',
  graphicDesign: 'Graphic Design',
  socialMedia: 'Social Media',
  events: 'Events',
  administration: 'Administration',
  fundraising: 'Fundraising',
  photographyVideography: 'Photography & Videography',
  healthEducation: 'Health Education',
  projectManagement: 'Project Management',
};

router.post('/volunteer-application', volunteerLimiter, async (req, res) => {
  const { name, email, interests = {}, message, consentConfirmed } = req.body || {};

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (consentConfirmed !== true) {
    return res.status(400).json({ error: 'You must confirm you understand the scope of volunteering with HER.' });
  }

  const selected = OPPORTUNITY_KEYS.filter((key) => Boolean(interests[key])).map(
    (key) => OPPORTUNITY_LABELS[key]
  );
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  try {
    const result = await pool.query(
      `INSERT INTO volunteer_applications (name, email, interests, message)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [trimmedName, trimmedEmail, selected, trimmedMessage]
    );

    sendVolunteerApplicationNotification({
      name: trimmedName,
      email: trimmedEmail,
      interests: selected,
      message: trimmedMessage,
    }).catch((err) => console.error('Failed to send volunteer application email:', err));

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Volunteer application failed:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
