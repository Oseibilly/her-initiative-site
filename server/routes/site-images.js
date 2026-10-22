const express = require('express');
const { pool } = require('../db');
const { requireAdmin } = require('../session');
const { uploadSiteImage } = require('../upload');

const router = express.Router();

const VALID_KEYS = [
  'home_hero',
  'home_problem',
  'work_her_women',
  'work_her_men',
  'work_her_youth',
  'work_her_community',
  'story_voices',
  'story_conversations',
  'story_experts',
  'home_community',
  'home_final_cta',
  'about_intro',
];

router.get('/site-images', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT key, image_url FROM site_images WHERE image_url IS NOT NULL'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch site images:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.get('/admin/site-images', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT key, image_url, updated_at FROM site_images');
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch admin site images:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.post('/admin/site-images/:key', requireAdmin, uploadSiteImage.single('image'), async (req, res) => {
  const { key } = req.params;
  if (!VALID_KEYS.includes(key)) {
    return res.status(400).json({ error: 'Unknown placeholder key.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'An image file is required.' });
  }

  const imageUrl = `/images/site/${req.file.filename}`;

  try {
    await pool.query(
      `INSERT INTO site_images (key, image_url, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET image_url = EXCLUDED.image_url, updated_at = now()`,
      [key, imageUrl]
    );
    res.status(200).json({ key, image_url: imageUrl });
  } catch (err) {
    console.error('Failed to save site image:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.delete('/admin/site-images/:key', requireAdmin, async (req, res) => {
  const { key } = req.params;
  if (!VALID_KEYS.includes(key)) {
    return res.status(400).json({ error: 'Unknown placeholder key.' });
  }

  try {
    await pool.query(
      `INSERT INTO site_images (key, image_url, updated_at) VALUES ($1, NULL, now())
       ON CONFLICT (key) DO UPDATE SET image_url = NULL, updated_at = now()`,
      [key]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to clear site image:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
