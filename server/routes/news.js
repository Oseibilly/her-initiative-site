const express = require('express');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db');
const { requireAdmin } = require('../session');
const {
  uploadNewsMedia,
  NEWS_DIR,
  NEWS_MAX_IMAGE_BYTES,
  NEWS_VIDEO_TYPES,
} = require('../upload');

const router = express.Router();

function mediaTypeOf(file) {
  return NEWS_VIDEO_TYPES.test(file.mimetype) ? 'video' : 'image';
}

function removeFileByUrl(url) {
  if (typeof url !== 'string') return;
  const file = path.join(NEWS_DIR, path.basename(url));
  fs.unlink(file, () => {});
}

function discardUploads(files) {
  (files || []).forEach((f) => fs.unlink(f.path, () => {}));
}

function parseBool(value, fallback) {
  if (value === undefined) return fallback;
  return value === true || value === 'true' || value === 'on' || value === '1';
}

async function attachMedia(posts) {
  if (posts.length === 0) return posts;
  const ids = posts.map((p) => p.id);
  const media = await pool.query(
    `SELECT id, post_id, media_type, url FROM news_media
     WHERE post_id = ANY($1::int[]) ORDER BY sort_order ASC, id ASC`,
    [ids]
  );
  const byPost = new Map();
  media.rows.forEach((m) => {
    if (!byPost.has(m.post_id)) byPost.set(m.post_id, []);
    byPost.get(m.post_id).push({ id: m.id, type: m.media_type, url: m.url });
  });
  return posts.map((p) => {
    const items = byPost.get(p.id) || [];
    const cover = items.find((m) => m.type === 'image');
    return { ...p, media: items, cover_url: cover ? cover.url : null };
  });
}

// ---------- Public ----------

router.get('/news', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  try {
    const result = await pool.query(
      `SELECT id, title, excerpt, body, COALESCE(published_at, created_at) AS published_at
       FROM news_posts
       WHERE is_published = true
       ORDER BY COALESCE(published_at, created_at) DESC, id DESC
       LIMIT $1`,
      [limit]
    );
    res.json(await attachMedia(result.rows));
  } catch (err) {
    console.error('Failed to fetch news:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.get('/news/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Post not found.' });
  try {
    const result = await pool.query(
      `SELECT id, title, excerpt, body, COALESCE(published_at, created_at) AS published_at
       FROM news_posts WHERE id = $1 AND is_published = true`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found.' });
    const [post] = await attachMedia(result.rows);
    res.json(post);
  } catch (err) {
    console.error('Failed to fetch news post:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// ---------- Admin ----------

router.get('/admin/news', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, excerpt, body, is_published,
              COALESCE(published_at, created_at) AS published_at, created_at, updated_at
       FROM news_posts
       ORDER BY created_at DESC, id DESC`
    );
    res.json(await attachMedia(result.rows));
  } catch (err) {
    console.error('Failed to fetch admin news list:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

function validate(body, files) {
  const { title, body: text } = body || {};
  if (typeof title !== 'string' || title.trim().length === 0) return 'Title is required.';
  if (typeof text !== 'string' || text.trim().length === 0) return 'The news text is required.';
  const tooBig = (files || []).find(
    (f) => mediaTypeOf(f) === 'image' && f.size > NEWS_MAX_IMAGE_BYTES
  );
  if (tooBig) return `"${tooBig.originalname}" is larger than 10MB. Please use a smaller image.`;
  return null;
}

async function insertMedia(client, postId, files) {
  const { rows } = await client.query(
    'SELECT COALESCE(MAX(sort_order), -1) AS max FROM news_media WHERE post_id = $1',
    [postId]
  );
  let order = Number(rows[0].max) + 1;
  for (const f of files) {
    await client.query(
      'INSERT INTO news_media (post_id, media_type, url, sort_order) VALUES ($1, $2, $3, $4)',
      [postId, mediaTypeOf(f), `/uploads/news/${f.filename}`, order++]
    );
  }
}

router.post('/admin/news', requireAdmin, uploadNewsMedia.array('media', 10), async (req, res) => {
  const files = req.files || [];
  const err = validate(req.body, files);
  if (err) {
    discardUploads(files);
    return res.status(400).json({ error: err });
  }

  const { title, excerpt, body } = req.body;
  const isPublished = parseBool(req.body.isPublished, true);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO news_posts (title, excerpt, body, is_published, published_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        title.trim(),
        typeof excerpt === 'string' && excerpt.trim() ? excerpt.trim() : null,
        body.trim(),
        isPublished,
        isPublished ? new Date() : null,
      ]
    );
    const id = result.rows[0].id;
    await insertMedia(client, id, files);
    await client.query('COMMIT');
    res.status(201).json({ id });
  } catch (e) {
    await client.query('ROLLBACK');
    discardUploads(files);
    console.error('Failed to create news post:', e);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  } finally {
    client.release();
  }
});

router.put('/admin/news/:id', requireAdmin, uploadNewsMedia.array('media', 10), async (req, res) => {
  const files = req.files || [];
  const err = validate(req.body, files);
  if (err) {
    discardUploads(files);
    return res.status(400).json({ error: err });
  }

  const id = parseInt(req.params.id, 10);
  const { title, excerpt, body } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT is_published, published_at FROM news_posts WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      discardUploads(files);
      return res.status(404).json({ error: 'Post not found.' });
    }
    const wasPublished = existing.rows[0].is_published;
    const isPublished = parseBool(req.body.isPublished, wasPublished);
    const publishedAt = isPublished
      ? existing.rows[0].published_at || new Date()
      : existing.rows[0].published_at;

    await client.query(
      `UPDATE news_posts
       SET title = $1, excerpt = $2, body = $3, is_published = $4, published_at = $5, updated_at = now()
       WHERE id = $6`,
      [
        title.trim(),
        typeof excerpt === 'string' && excerpt.trim() ? excerpt.trim() : null,
        body.trim(),
        isPublished,
        publishedAt,
        id,
      ]
    );
    await insertMedia(client, id, files);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    discardUploads(files);
    console.error('Failed to update news post:', e);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  } finally {
    client.release();
  }
});

router.delete('/admin/news/:id/media/:mediaId', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM news_media WHERE id = $1 AND post_id = $2 RETURNING url',
      [req.params.mediaId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Media not found.' });
    removeFileByUrl(result.rows[0].url);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete news media:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.delete('/admin/news/:id', requireAdmin, async (req, res) => {
  try {
    const media = await pool.query('SELECT url FROM news_media WHERE post_id = $1', [req.params.id]);
    await pool.query('DELETE FROM news_posts WHERE id = $1', [req.params.id]);
    media.rows.forEach((m) => removeFileByUrl(m.url));
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete news post:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
