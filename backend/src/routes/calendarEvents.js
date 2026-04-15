import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toEvent = (r) => ({
  id: r.id,
  userId: r.user_id,
  eventName: r.event_name,
  eventDate: r.event_date,
  eventTime: r.event_time || '',
  notes: r.notes || '',
  createdAt: r.created_at,
});

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, user_id, event_name, event_date, event_time, notes, created_at
       FROM calendar_events
       WHERE user_id = $1
       ORDER BY event_date ASC, event_time ASC NULLS LAST, created_at DESC`,
      [req.user.dataUserId],
    );
    res.json(rows.map(toEvent));
  } catch (err) {
    console.error('[calendar-events list]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { eventName, eventDate, eventTime, notes } = req.body;
    const name = String(eventName || '').trim();
    const date = String(eventDate || '').trim();
    if (!name || !date) return res.status(400).json({ error: 'Event name and date are required' });

    const id = `EV-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { rows } = await pool.query(
      `INSERT INTO calendar_events (id, user_id, event_name, event_date, event_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, event_name, event_date, event_time, notes, created_at`,
      [id, req.user.dataUserId, name, date, String(eventTime || '').trim() || null, String(notes || '').trim()],
    );
    res.status(201).json(toEvent(rows[0]));
  } catch (err) {
    console.error('[calendar-events create]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM calendar_events WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.dataUserId],
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[calendar-events delete]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
