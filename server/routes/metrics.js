const express = require('express');
const { pool } = require('../db');
const { requireAdmin } = require('../session');

const router = express.Router();

router.get('/metrics', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT key, label, value FROM impact_metrics ORDER BY sort_order ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch metrics:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.put('/admin/metrics', requireAdmin, async (req, res) => {
  const { metrics } = req.body || {};
  if (!Array.isArray(metrics)) {
    return res.status(400).json({ error: 'metrics must be an array of { key, value }.' });
  }

  for (const m of metrics) {
    if (typeof m.key !== 'string' || !Number.isFinite(Number(m.value)) || Number(m.value) < 0) {
      return res.status(400).json({ error: `Invalid metric entry for key "${m.key}".` });
    }
  }

  try {
    await Promise.all(
      metrics.map((m) =>
        pool.query(
          'UPDATE impact_metrics SET value = $1, updated_at = now() WHERE key = $2',
          [Math.round(Number(m.value)), m.key]
        )
      )
    );
    const result = await pool.query(
      'SELECT key, label, value FROM impact_metrics ORDER BY sort_order ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to update metrics:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
