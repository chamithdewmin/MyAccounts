import pool from '../config/db.js';

export const findAllByUser = (userId) =>
  pool.query(
    `SELECT id, type, reference_id, reminder_date, sms_contact, status, reason, amount, created_at
     FROM reminders WHERE user_id = $1 ORDER BY reminder_date ASC`,
    [userId],
  );

export const findByIdAndUser = (id, userId) =>
  pool.query('SELECT * FROM reminders WHERE id = $1 AND user_id = $2', [id, userId]);

export const insert = (id, userId, type, referenceId, reminderDate, smsContact, reason, amount) =>
  pool.query(
    `INSERT INTO reminders (id, user_id, type, reference_id, reminder_date, sms_contact, status, reason, amount)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8)`,
    [id, userId, type, referenceId, reminderDate, smsContact, reason || '', amount || 0],
  );

export const updateStatus = (id, userId, status) =>
  pool.query('UPDATE reminders SET status = $2 WHERE id = $1 AND user_id = $3', [id, status, userId]);

export const remove = (id, userId) =>
  pool.query('DELETE FROM reminders WHERE id = $1 AND user_id = $2', [id, userId]);
