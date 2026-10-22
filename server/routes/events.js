const express = require('express');
const { pool } = require('../db');
const { requireAdmin } = require('../session');
const { sendEventNotification } = require('../mailer');

const router = express.Router();

router.get('/events', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, event_date, location
       FROM events
       WHERE event_date >= now() - interval '1 day'
       ORDER BY event_date ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch events:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.get('/admin/events', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, event_date, location, notify_members, notified_at, created_at
       FROM events ORDER BY event_date DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch admin events list:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

function validateEventBody(body) {
  const { title, eventDate } = body || {};
  if (typeof title !== 'string' || title.trim().length === 0) {
    return 'Title is required.';
  }
  if (typeof eventDate !== 'string' || Number.isNaN(Date.parse(eventDate))) {
    return 'A valid event date is required.';
  }
  return null;
}

router.post('/admin/events', requireAdmin, async (req, res) => {
  const err = validateEventBody(req.body);
  if (err) return res.status(400).json({ error: err });

  const { title, description, eventDate, location, notifyMembers } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO events (title, description, event_date, location, notify_members)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        title.trim(),
        typeof description === 'string' ? description.trim() : null,
        new Date(eventDate),
        typeof location === 'string' ? location.trim() : null,
        Boolean(notifyMembers),
      ]
    );
    const eventId = result.rows[0].id;

    if (notifyMembers) {
      notifyAllMembers(eventId, { title, description, eventDate, location }).catch((e) =>
        console.error('Failed to send event notification emails:', e)
      );
    }

    res.status(201).json({ id: eventId });
  } catch (err) {
    console.error('Failed to create event:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.put('/admin/events/:id', requireAdmin, async (req, res) => {
  const err = validateEventBody(req.body);
  if (err) return res.status(400).json({ error: err });

  const { title, description, eventDate, location, notifyMembers } = req.body;
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT notified_at FROM events WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    await pool.query(
      `UPDATE events
       SET title = $1, description = $2, event_date = $3, location = $4, notify_members = $5, updated_at = now()
       WHERE id = $6`,
      [
        title.trim(),
        typeof description === 'string' ? description.trim() : null,
        new Date(eventDate),
        typeof location === 'string' ? location.trim() : null,
        Boolean(notifyMembers),
        id,
      ]
    );

    if (notifyMembers && !existing.rows[0].notified_at) {
      notifyAllMembers(id, { title, description, eventDate, location }).catch((e) =>
        console.error('Failed to send event notification emails:', e)
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to update event:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.delete('/admin/events/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete event:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

async function notifyAllMembers(eventId, { title, description, eventDate, location }) {
  const members = await pool.query("SELECT email FROM users WHERE role = 'member'");
  const recipients = members.rows.map((m) => m.email);
  await sendEventNotification({ title, description, eventDate, location, recipients });
  await pool.query('UPDATE events SET notified_at = now() WHERE id = $1', [eventId]);
}

module.exports = router;
