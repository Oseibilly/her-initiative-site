const express = require('express');
const { pool } = require('../db');
const { requireAdmin } = require('../session');

const router = express.Router();

router.get('/admin/summary', requireAdmin, async (req, res) => {
  try {
    const [members, admins, upcomingEvents, suggestions, executives] = await Promise.all([
      pool.query("SELECT count(*)::int AS count FROM users WHERE role = 'member'"),
      pool.query("SELECT count(*)::int AS count FROM users WHERE role = 'admin'"),
      pool.query(`SELECT count(*)::int AS count FROM events WHERE event_date >= now()`),
      pool.query('SELECT count(*)::int AS count FROM suggestions'),
      pool.query('SELECT count(*)::int AS count FROM executives'),
    ]);

    res.json({
      members: members.rows[0].count,
      admins: admins.rows[0].count,
      upcomingEvents: upcomingEvents.rows[0].count,
      suggestions: suggestions.rows[0].count,
      executives: executives.rows[0].count,
    });
  } catch (err) {
    console.error('Failed to fetch admin summary:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
