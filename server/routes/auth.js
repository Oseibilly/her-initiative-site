const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, full_name, role, password_hash FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Login failed. Please try again.' });
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.fullName = user.full_name;
      res.json({ ok: true, role: user.role });
    });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({
      authenticated: true,
      role: req.session.role,
      name: req.session.fullName,
    });
  }
  res.json({ authenticated: false });
});

module.exports = router;
