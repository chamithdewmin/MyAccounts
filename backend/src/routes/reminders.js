import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query(
      'SELECT id, type, reference_id, reminder_date, sms_contact, message, status, sent_at, created_at FROM reminders WHERE user_id = $1 ORDER BY reminder_date DESC, created_at DESC',
      [uid]
    );
    res.json(rows.map((r) => ({
      id: r.id,
      type: r.type,
      referenceId: r.reference_id,
      reminderDate: r.reminder_date,
      smsContact: r.sms_contact,
      message: r.message || '',
      status: r.status || 'pending',
      sentAt: r.sent_at,
      createdAt: r.created_at,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { type, referenceId, reminderDate, smsContact, message } = req.body;
    if (!type || !referenceId || !reminderDate || !smsContact) {
      return res.status(400).json({ error: 'Type, reference ID, reminder date, and SMS contact are required' });
    }
    const validTypes = ['income', 'expense'];
    if (!validTypes.includes(String(type).toLowerCase())) {
      return res.status(400).json({ error: 'Type must be income or expense' });
    }
    const id = `REM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await pool.query(
      'INSERT INTO reminders (id, user_id, type, reference_id, reminder_date, sms_contact, message) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, uid, String(type).toLowerCase(), String(referenceId), reminderDate, String(smsContact).trim(), message || '']
    );
    res.status(201).json({
      id,
      type: String(type).toLowerCase(),
      referenceId: String(referenceId),
      reminderDate,
      smsContact: String(smsContact).trim(),
      message: message || '',
      status: 'pending',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rowCount } = await pool.query('DELETE FROM reminders WHERE id = $1 AND user_id = $2', [req.params.id, uid]);
    if (rowCount === 0) return res.status(404).json({ error: 'Reminder not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
