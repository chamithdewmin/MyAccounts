import pool from '../config/db.js';

export const findAllByUser = (userId) =>
  pool.query(
    `SELECT id, category, amount, currency, date, notes, payment_method,
            is_recurring, recurring_frequency, recurring_end_date, recurring_notes,
            receipt, created_at
     FROM expenses WHERE user_id = $1 ORDER BY date DESC, created_at DESC`,
    [userId],
  );

export const findById = (id) =>
  pool.query('SELECT * FROM expenses WHERE id = $1', [id]);

export const findByIdAndUser = (id, userId) =>
  pool.query('SELECT * FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);

export const insert = (id, userId, d) =>
  pool.query(
    `INSERT INTO expenses (id, user_id, category, amount, currency, date, notes,
      payment_method, is_recurring, recurring_frequency, recurring_end_date, recurring_notes, receipt)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      id, userId, d.category || 'Other', Number(d.amount) || 0,
      d.currency || 'LKR', d.date || new Date().toISOString(), d.notes || '',
      d.paymentMethod || 'cash', Boolean(d.isRecurring),
      d.recurringFrequency || 'monthly', d.recurringEndDate || null,
      d.recurringNotes || '', d.receipt ? JSON.stringify(d.receipt) : null,
    ],
  );

export const update = (id, userId, d) =>
  pool.query(
    `UPDATE expenses SET category = COALESCE($2, category), amount = COALESCE($3, amount),
     date = COALESCE($4, date), payment_method = COALESCE($5, payment_method),
     is_recurring = COALESCE($6, is_recurring), recurring_frequency = COALESCE($7, recurring_frequency),
     recurring_end_date = $8, recurring_notes = COALESCE($9, recurring_notes),
     notes = COALESCE($10, notes), receipt = COALESCE($11, receipt)
     WHERE id = $1 AND user_id = $12`,
    [
      id, d.category, d.amount ? Number(d.amount) : null, d.date, d.paymentMethod,
      d.isRecurring, d.recurringFrequency,
      d.continueIndefinitely ? null : (d.recurringEndDate ?? null),
      d.recurringNotes, d.notes,
      d.receipt ? JSON.stringify(d.receipt) : null,
      userId,
    ],
  );

export const remove = (id, userId) =>
  pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);
