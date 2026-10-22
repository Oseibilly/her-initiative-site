require('dotenv').config();
const { pool } = require('../db');

async function tableExists(client, name) {
  const result = await client.query('SELECT to_regclass($1) IS NOT NULL AS exists', [
    `public.${name}`,
  ]);
  return result.rows[0].exists;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const hasAdmins = await tableExists(client, 'admins');
    if (hasAdmins) {
      const { rowCount } = await client.query(`
        INSERT INTO users (email, password_hash, full_name, role)
        SELECT email, password_hash, 'Admin', 'admin' FROM admins
        ON CONFLICT (email) DO NOTHING
      `);
      console.log(`Copied ${rowCount} admin account(s) into users.`);
    }

    const hasMembers = await tableExists(client, 'members');
    if (hasMembers) {
      const { rowCount } = await client.query(`
        INSERT INTO users (email, password_hash, full_name, role)
        SELECT email, password_hash, full_name, 'member' FROM members
        ON CONFLICT (email) DO NOTHING
      `);
      console.log(`Copied ${rowCount} member account(s) into users.`);
    }

    const hasOldMemberIdCol = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'suggestions' AND column_name = 'member_id'
    `);
    if (hasOldMemberIdCol.rows.length > 0) {
      await client.query(
        `ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`
      );
      if (hasMembers) {
        await client.query(`
          UPDATE suggestions s
          SET user_id = u.id
          FROM members m
          JOIN users u ON u.email = m.email
          WHERE s.member_id = m.id AND s.user_id IS NULL
        `);
      }
      await client.query(`ALTER TABLE suggestions DROP COLUMN member_id`);
      console.log('Migrated suggestions.member_id -> suggestions.user_id.');
    }

    if (hasAdmins) {
      await client.query(`ALTER TABLE admins RENAME TO _deprecated_admins`);
      console.log('Renamed admins -> _deprecated_admins.');
    }
    if (hasMembers) {
      await client.query(`ALTER TABLE members RENAME TO _deprecated_members`);
      console.log('Renamed members -> _deprecated_members.');
    }

    await client.query('COMMIT');
    console.log('Migration to unified users table complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back. No changes were made:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
