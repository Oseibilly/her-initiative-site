require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

async function main() {
  console.log('(input is not masked — make sure no one is watching your screen)');
  console.log('This creates/updates an ADMIN account. For member accounts, use the "Manage Users" section in /admin once logged in.');
  const fullName = (await ask('Full name: ')).trim();
  const email = (await ask('Admin email: ')).trim().toLowerCase();
  const password = await ask('Admin password (min 8 characters): ');
  rl.close();

  if (!fullName || !email || !password || password.length < 8) {
    console.error('Full name and email are required, and password must be at least 8 characters.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, role = 'admin'`,
      [email, passwordHash, fullName]
    );
    console.log(`Admin account ready for ${email}.`);
  } catch (err) {
    console.error('Failed to create admin:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
