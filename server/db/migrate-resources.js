require('dotenv').config();
const { pool } = require('../db');

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS resource_articles (
        id SERIAL PRIMARY KEY,
        section TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        excerpt TEXT,
        body TEXT NOT NULL,
        is_published BOOLEAN NOT NULL DEFAULT true,
        published_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS resource_articles_section_idx ON resource_articles (section, is_published)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS resource_media (
        id SERIAL PRIMARY KEY,
        article_id INTEGER NOT NULL REFERENCES resource_articles(id) ON DELETE CASCADE,
        media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
        url TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS resource_media_article_idx ON resource_media (article_id, sort_order, id)');
    await client.query('COMMIT');
    console.log('Migration complete: resource_articles and resource_media are ready.');
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
