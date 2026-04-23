import pool from '../config/db.js';

export const findAllByUser = (userId) =>
  pool.query('SELECT * FROM loans WHERE user_id = $1 ORDER BY created_at DESC', [userId]);

export const insert = (id, userId, d) =>
  pool.query(
    'INSERT INTO loans (id, user_id, name, lender, amount, interest_rate, start_date, end_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [id, userId, d.name || '', d.lender || '', Number(d.amount) || 0, Number(d.interestRate) || 0, d.startDate || null, d.endDate || null, d.notes || ''],
  );

export const remove = (id, userId) =>
  pool.query('DELETE FROM loans WHERE id = $1 AND user_id = $2', [id, userId]);
