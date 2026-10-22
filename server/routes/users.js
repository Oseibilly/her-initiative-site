const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireAdmin } = require('../session');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ['admin', 'member'];

router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role, created_at FROM users ORDER BY full_name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.post('/admin/users', requireAdmin, async (req, res) => {
  const { fullName, email, password, role } = req.body || {};

  if (typeof fullName !== 'string' || fullName.trim().length === 0) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Role must be "admin" or "member".' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [email.trim().toLowerCase(), passwordHash, fullName.trim(), role]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    console.error('Failed to create user:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.put('/admin/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { fullName, email, password, role } = req.body || {};

  if (typeof fullName !== 'string' || fullName.trim().length === 0) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (password && password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Role must be "admin" or "member".' });
  }

  try {
    if (role !== 'admin') {
      const adminCount = await pool.query(
        "SELECT count(*)::int AS count FROM users WHERE role = 'admin' AND id != $1",
        [id]
      );
      if (adminCount.rows[0].count === 0) {
        return res.status(400).json({ error: "Can't remove the last remaining admin." });
      }
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      await pool.query(
        'UPDATE users SET full_name = $1, email = $2, password_hash = $3, role = $4 WHERE id = $5',
        [fullName.trim(), email.trim().toLowerCase(), passwordHash, role, id]
      );
    } else {
      await pool.query('UPDATE users SET full_name = $1, email = $2, role = $3 WHERE id = $4', [
        fullName.trim(),
        email.trim().toLowerCase(),
        role,
        id,
      ]);
    }
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    console.error('Failed to update user:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.delete('/admin/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const target = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (target.rows[0] && target.rows[0].role === 'admin') {
      const adminCount = await pool.query(
        "SELECT count(*)::int AS count FROM users WHERE role = 'admin' AND id != $1",
        [id]
      );
      if (adminCount.rows[0].count === 0) {
        return res.status(400).json({ error: "Can't delete the last remaining admin." });
      }
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete user:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
