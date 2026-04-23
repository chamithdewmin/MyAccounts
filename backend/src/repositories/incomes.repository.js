import pool from '../config/db.js';

export const findAllByUser = (userId) =>
  pool.query(
    `SELECT id, client_id, client_name, service_type, payment_method,
            amount, currency, date, notes, is_recurring, recurring_frequency,
            recurring_end_date, recurring_notes, created_at
     FROM incomes WHERE user_id = $1 ORDER BY date DESC, created_at DESC`,
    [userId],
  );

export const findById = (id) =>
  pool.query('SELECT * FROM incomes WHERE id = $1', [id]);

export const findByIdAndUser = (id, userId) =>
  pool.query('SELECT * FROM incomes WHERE id = $1 AND user_id = $2', [id, userId]);

export const insert = (id, userId, d) =>
  pool.query(
    `INSERT INTO incomes (id, user_id, client_id, client_name, service_type, payment_method,
      amount, currency, date, notes, is_recurring, recurring_frequency, recurring_end_date, recurring_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      id, userId,
      d.clientId || null, d.clientName || '', d.serviceType || '',
      d.paymentMethod || 'cash', Number(d.amount) || 0, d.currency || 'LKR',
      d.date || new Date().toISOString(), d.notes || '',
      Boolean(d.isRecurring), d.recurringFrequency || 'monthly',
      d.recurringEndDate || null, d.recurringNotes || '',
    ],
  );

export const update = (id, userId, d) =>
  pool.query(
    `UPDATE incomes SET client_id = COALESCE($2, client_id), client_name = COALESCE($3, client_name),
     service_type = COALESCE($4, service_type), payment_method = COALESCE($5, payment_method),
     amount = COALESCE($6, amount), date = COALESCE($7, date), notes = COALESCE($8, notes),
     is_recurring = COALESCE($9, is_recurring), recurring_frequency = COALESCE($10, recurring_frequency),
     recurring_end_date = $11, recurring_notes = COALESCE($12, recurring_notes)
     WHERE id = $1 AND user_id = $13`,
    [
      id, d.clientId, d.clientName, d.serviceType, d.paymentMethod,
      d.amount ? Number(d.amount) : null, d.date, d.notes,
      d.isRecurringInflow ?? d.isRecurring, d.recurringFrequency,
      d.continueIndefinitely ? null : (d.recurringEndDate ?? null),
      d.recurringNotes, userId,
    ],
  );

export const remove = (id, userId) =>
  pool.query('DELETE FROM incomes WHERE id = $1 AND user_id = $2', [id, userId]);
