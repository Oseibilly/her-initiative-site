const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../session');

const router = express.Router();

router.get('/suggestions', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, member_name, message, created_at FROM suggestions ORDER BY created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch suggestions:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.post('/suggestions', requireAuth, async (req, res) => {
  const { message } = req.body || {};
  if (typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'A message is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO suggestions (user_id, member_name, message)
       VALUES ($1, $2, $3) RETURNING id`,
      [req.session.userId, req.session.fullName, message.trim()]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Failed to create suggestion:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.delete('/admin/suggestions/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM suggestions WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete suggestion:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
