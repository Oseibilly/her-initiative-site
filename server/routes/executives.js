const express = require('express');
const { pool } = require('../db');
const { requireAdmin } = require('../session');
const upload = require('../upload');

const router = express.Router();

router.get('/executives', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, position, photo_url FROM executives ORDER BY sort_order ASC, id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch executives:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.get('/admin/executives', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, position, photo_url, sort_order FROM executives ORDER BY sort_order ASC, id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch admin executives list:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.post('/admin/executives', requireAdmin, upload.single('photo'), async (req, res) => {
  const { name, position, sortOrder } = req.body || {};
  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (typeof position !== 'string' || position.trim().length === 0) {
    return res.status(400).json({ error: 'Position is required.' });
  }

  const photoUrl = req.file ? `/images/executives/${req.file.filename}` : null;

  try {
    const result = await pool.query(
      `INSERT INTO executives (name, position, photo_url, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [name.trim(), position.trim(), photoUrl, Number(sortOrder) || 0]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Failed to create executive:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.put('/admin/executives/:id', requireAdmin, upload.single('photo'), async (req, res) => {
  const { id } = req.params;
  const { name, position, sortOrder } = req.body || {};
  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (typeof position !== 'string' || position.trim().length === 0) {
    return res.status(400).json({ error: 'Position is required.' });
  }

  try {
    if (req.file) {
      const photoUrl = `/images/executives/${req.file.filename}`;
      await pool.query(
        `UPDATE executives SET name = $1, position = $2, photo_url = $3, sort_order = $4, updated_at = now()
         WHERE id = $5`,
        [name.trim(), position.trim(), photoUrl, Number(sortOrder) || 0, id]
      );
    } else {
      await pool.query(
        `UPDATE executives SET name = $1, position = $2, sort_order = $3, updated_at = now()
         WHERE id = $4`,
        [name.trim(), position.trim(), Number(sortOrder) || 0, id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to update executive:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.delete('/admin/executives/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM executives WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete executive:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
