require('dotenv').config();
const { pool } = require('../db');

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_images (
        key TEXT PRIMARY KEY,
        image_url TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query('COMMIT');
    console.log('Migration complete: site_images table ready.');
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
