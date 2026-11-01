require('dotenv').config();
const { pool } = require('../db');

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS news_posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        excerpt TEXT,
        body TEXT NOT NULL,
        is_published BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query('ALTER TABLE news_posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ');
    await client.query('UPDATE news_posts SET published_at = created_at WHERE is_published AND published_at IS NULL');
    await client.query(`
      CREATE TABLE IF NOT EXISTS news_media (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES news_posts(id) ON DELETE CASCADE,
        media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
        url TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS news_media_post_idx ON news_media (post_id, sort_order, id)');
    await client.query('COMMIT');
    console.log('Migration complete: news_posts.published_at and news_media are ready.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
