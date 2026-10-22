const express = require('express');
const { pool } = require('../db');
const { requireAdmin } = require('../session');

const router = express.Router();

const TABLES = {
  join: {
    table: 'community_signups',
    columns: 'id, name, email, newsletter, support_groups, events, volunteering, financial_support, created_at',
  },
  volunteer: {
    table: 'volunteer_applications',
    columns: 'id, name, email, interests, message, created_at',
  },
  partner: {
    table: 'partner_inquiries',
    columns:
      'id, organization, contact_name, role, email, phone, message, partnership_opportunities, healthcare_collaboration, corporate_partnerships, research_collaborations, sponsorship_information, created_at',
  },
  support: {
    table: 'support_interests',
    columns: 'id, name, email, donating, sponsorship, programmes, message, created_at',
  },
  contact: {
    table: 'contact_messages',
    columns: 'id, name, email, category, message, created_at',
  },
};

router.get('/admin/submissions/:type', requireAdmin, async (req, res) => {
  const cfg = TABLES[req.params.type];
  if (!cfg) return res.status(404).json({ error: 'Unknown submission type.' });

  try {
    const result = await pool.query(
      `SELECT ${cfg.columns} FROM ${cfg.table} ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(`Failed to fetch ${req.params.type} submissions:`, err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.delete('/admin/submissions/:type/:id', requireAdmin, async (req, res) => {
  const cfg = TABLES[req.params.type];
  if (!cfg) return res.status(404).json({ error: 'Unknown submission type.' });

  try {
    await pool.query(`DELETE FROM ${cfg.table} WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(`Failed to delete ${req.params.type} submission:`, err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
