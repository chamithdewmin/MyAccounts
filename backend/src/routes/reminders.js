import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    let rows = [];
    try {
      const result = await pool.query(
        'SELECT id, type, reference_id, reason, reminder_date, sms_contact, message, status, sent_at, created_at FROM reminders WHERE user_id = $1 ORDER BY reminder_date DESC, created_at DESC',
        [uid]
      );
      rows = result.rows;
    } catch (tblErr) {
      if (tblErr.code === '42P01') {
        return res.json([]);
      }
      throw tblErr;
    }
    res.json(rows.map((r) => ({
      id: r.id,
      type: r.type,
      referenceId: r.reference_id,
      reason: r.reason || '',
      reminderDate: r.reminder_date,
      smsContact: r.sms_contact,
      message: r.message || '',
      status: r.status || 'pending',
      sentAt: r.sent_at,
      createdAt: r.created_at,
    })));
  } catch (err) {
    console.error('[reminders GET]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { type, referenceId, reason, reminderDate, smsContact, message } = req.body;
    if (!reminderDate || !smsContact) {
      return res.status(400).json({ error: 'Reminder date and SMS contact are required' });
    }
    const hasReason = reason && String(reason).trim();
    const hasRef = type && referenceId && ['income', 'expense'].includes(String(type).toLowerCase());
    if (!hasReason && !hasRef) {
      return res.status(400).json({ error: 'Enter reminder reason/name' });
    }
    const id = `REM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const rType = hasRef ? String(type).toLowerCase() : '';
    const rRef = hasRef ? String(referenceId) : '';
    const rReason = hasReason ? String(reason).trim() : '';
    await pool.query(
      'INSERT INTO reminders (id, user_id, type, reference_id, reason, reminder_date, sms_contact, message) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, uid, rType, rRef, rReason, reminderDate, String(smsContact).trim(), message || '']
    );
    res.status(201).json({
      id,
      type: rType,
      referenceId: rRef,
      reason: rReason,
      reminderDate,
      smsContact: String(smsContact).trim(),
      message: message || '',
      status: 'pending',
    });
  } catch (err) {
    console.error('[reminders POST]', err);
    res.status(500).json({ error: err.code === '42P01' ? 'Reminders not available yet. Please restart the server.' : 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rowCount } = await pool.query('DELETE FROM reminders WHERE id = $1 AND user_id = $2', [req.params.id, uid]);
    if (rowCount === 0) return res.status(404).json({ error: 'Reminder not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[reminders DELETE]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
