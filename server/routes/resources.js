const express = require('express');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db');
const { requireAdmin } = require('../session');
const {
  uploadArticleMedia,
  ARTICLES_DIR,
  NEWS_MAX_IMAGE_BYTES,
  NEWS_VIDEO_TYPES,
} = require('../upload');
const { SECTIONS, SECTION_SLUGS, getSection } = require('../resource-sections');

const router = express.Router();

function mediaTypeOf(file) {
  return NEWS_VIDEO_TYPES.test(file.mimetype) ? 'video' : 'image';
}

function removeFileByUrl(url) {
  if (typeof url !== 'string') return;
  fs.unlink(path.join(ARTICLES_DIR, path.basename(url)), () => {});
}

function discardUploads(files) {
  (files || []).forEach((f) => fs.unlink(f.path, () => {}));
}

function parseBool(value, fallback) {
  if (value === undefined) return fallback;
  return value === true || value === 'true' || value === 'on' || value === '1';
}

function withSection(article) {
  const section = getSection(article.section);
  return { ...article, section_title: section ? section.title : article.section };
}

async function attachMedia(articles) {
  if (articles.length === 0) return articles;
  const ids = articles.map((a) => a.id);
  const media = await pool.query(
    `SELECT id, article_id, media_type, url FROM resource_media
     WHERE article_id = ANY($1::int[]) ORDER BY sort_order ASC, id ASC`,
    [ids]
  );
  const byArticle = new Map();
  media.rows.forEach((m) => {
    if (!byArticle.has(m.article_id)) byArticle.set(m.article_id, []);
    byArticle.get(m.article_id).push({ id: m.id, type: m.media_type, url: m.url });
  });
  return articles.map((a) => {
    const items = byArticle.get(a.id) || [];
    const cover = items.find((m) => m.type === 'image');
    return withSection({ ...a, media: items, cover_url: cover ? cover.url : null });
  });
}

// ---------- Public ----------

router.get('/resources/sections', async (req, res) => {
  try {
    const counts = await pool.query(
      `SELECT section, COUNT(*)::int AS count FROM resource_articles
       WHERE is_published = true GROUP BY section`
    );
    const countBySlug = new Map(counts.rows.map((r) => [r.section, r.count]));
    res.json(SECTIONS.map((s) => ({ ...s, count: countBySlug.get(s.slug) || 0 })));
  } catch (err) {
    console.error('Failed to fetch resource sections:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.get('/resources/articles', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const section = typeof req.query.section === 'string' ? req.query.section : null;
  if (section && !SECTION_SLUGS.includes(section)) return res.json([]);
  try {
    const result = await pool.query(
      `SELECT id, section, title, author, excerpt, LEFT(body, 400) AS preview,
              COALESCE(published_at, created_at) AS published_at
       FROM resource_articles
       WHERE is_published = true AND ($1::text IS NULL OR section = $1)
       ORDER BY COALESCE(published_at, created_at) DESC, id DESC
       LIMIT $2`,
      [section, limit]
    );
    res.json(await attachMedia(result.rows));
  } catch (err) {
    console.error('Failed to fetch resource articles:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.get('/resources/articles/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Article not found.' });
  try {
    const result = await pool.query(
      `SELECT id, section, title, author, excerpt, body,
              COALESCE(published_at, created_at) AS published_at
       FROM resource_articles WHERE id = $1 AND is_published = true`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Article not found.' });
    const [article] = await attachMedia(result.rows);
    res.json(article);
  } catch (err) {
    console.error('Failed to fetch resource article:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// ---------- Admin ----------

router.get('/admin/resources/articles', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, section, title, author, excerpt, body, is_published,
              COALESCE(published_at, created_at) AS published_at, created_at, updated_at
       FROM resource_articles
       ORDER BY created_at DESC, id DESC`
    );
    res.json(await attachMedia(result.rows));
  } catch (err) {
    console.error('Failed to fetch admin resource articles:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

function validate(body, files) {
  const { section, title, body: text } = body || {};
  if (!SECTION_SLUGS.includes(section)) return 'Please choose a section.';
  if (typeof title !== 'string' || title.trim().length === 0) return 'Title is required.';
  if (typeof text !== 'string' || text.trim().length === 0) return 'The article text is required.';
  const tooBig = (files || []).find(
    (f) => mediaTypeOf(f) === 'image' && f.size > NEWS_MAX_IMAGE_BYTES
  );
  if (tooBig) return `"${tooBig.originalname}" is larger than 10MB. Please use a smaller image.`;
  return null;
}

function cleanOptional(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function insertMedia(client, articleId, files) {
  const { rows } = await client.query(
    'SELECT COALESCE(MAX(sort_order), -1) AS max FROM resource_media WHERE article_id = $1',
    [articleId]
  );
  let order = Number(rows[0].max) + 1;
  for (const f of files) {
    await client.query(
      'INSERT INTO resource_media (article_id, media_type, url, sort_order) VALUES ($1, $2, $3, $4)',
      [articleId, mediaTypeOf(f), `/uploads/articles/${f.filename}`, order++]
    );
  }
}

router.post('/admin/resources/articles', requireAdmin, uploadArticleMedia.array('media', 10), async (req, res) => {
  const files = req.files || [];
  const err = validate(req.body, files);
  if (err) {
    discardUploads(files);
    return res.status(400).json({ error: err });
  }

  const { section, title, body } = req.body;
  const isPublished = parseBool(req.body.isPublished, true);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO resource_articles (section, title, author, excerpt, body, is_published, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        section,
        title.trim(),
        cleanOptional(req.body.author),
        cleanOptional(req.body.excerpt),
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
    console.error('Failed to create resource article:', e);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  } finally {
    client.release();
  }
});

router.put('/admin/resources/articles/:id', requireAdmin, uploadArticleMedia.array('media', 10), async (req, res) => {
  const files = req.files || [];
  const err = validate(req.body, files);
  if (err) {
    discardUploads(files);
    return res.status(400).json({ error: err });
  }

  const id = parseInt(req.params.id, 10);
  const { section, title, body } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT is_published, published_at FROM resource_articles WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      discardUploads(files);
      return res.status(404).json({ error: 'Article not found.' });
    }
    const isPublished = parseBool(req.body.isPublished, existing.rows[0].is_published);
    const publishedAt = isPublished
      ? existing.rows[0].published_at || new Date()
      : existing.rows[0].published_at;

    await client.query(
      `UPDATE resource_articles
       SET section = $1, title = $2, author = $3, excerpt = $4, body = $5,
           is_published = $6, published_at = $7, updated_at = now()
       WHERE id = $8`,
      [
        section,
        title.trim(),
        cleanOptional(req.body.author),
        cleanOptional(req.body.excerpt),
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
    console.error('Failed to update resource article:', e);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  } finally {
    client.release();
  }
});

router.delete('/admin/resources/articles/:id/media/:mediaId', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM resource_media WHERE id = $1 AND article_id = $2 RETURNING url',
      [req.params.mediaId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Media not found.' });
    removeFileByUrl(result.rows[0].url);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete resource media:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.delete('/admin/resources/articles/:id', requireAdmin, async (req, res) => {
  try {
    const media = await pool.query('SELECT url FROM resource_media WHERE article_id = $1', [req.params.id]);
    await pool.query('DELETE FROM resource_articles WHERE id = $1', [req.params.id]);
    media.rows.forEach((m) => removeFileByUrl(m.url));
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete resource article:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
