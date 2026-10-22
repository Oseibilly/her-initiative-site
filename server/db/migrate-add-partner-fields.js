require('dotenv').config();
const { pool } = require('../db');

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('ALTER TABLE partner_inquiries ADD COLUMN IF NOT EXISTS role TEXT');
    await client.query('ALTER TABLE partner_inquiries ADD COLUMN IF NOT EXISTS phone TEXT');
    await client.query('COMMIT');
    console.log('Migration complete: partner_inquiries.role and partner_inquiries.phone added.');
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
