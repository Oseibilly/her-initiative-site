require('dotenv').config();
const { pool } = require('../db');

const OLD_KEYS = [
  'individuals_educated',
  'communities_reached',
  'awareness_campaigns',
  'partnerships_created',
  'resources_developed',
  'lives_impacted',
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT key FROM impact_metrics WHERE key = ANY($1)`,
      [OLD_KEYS]
    );
    if (existing.rows.length > 0) {
      await client.query(`DELETE FROM impact_metrics WHERE key = ANY($1)`, [OLD_KEYS]);
      console.log(`Removed ${existing.rows.length} old metric row(s).`);
    } else {
      console.log('No old metric rows found — nothing to remove.');
    }

    await client.query(`
      INSERT INTO impact_metrics (key, label, value, sort_order) VALUES
        ('people_reached', 'People reached', 0, 1),
        ('people_educated', 'People educated', 0, 2),
        ('communities_engaged', 'Communities engaged', 0, 3),
        ('volunteers_advocates', 'Volunteers and advocates', 0, 4),
        ('partnerships', 'Partnerships', 0, 5),
        ('learning_outcomes', 'Learning and outcomes', 0, 6)
      ON CONFLICT (key) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('Impact metrics reseeded with new categories.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
