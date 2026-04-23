import pool from '../config/db.js';

export const findAllByUser = (userId) =>
  pool.query(
    'SELECT id, from_account, to_account, amount, date, notes, created_at FROM transfers WHERE user_id = $1 ORDER BY date DESC, created_at DESC',
    [userId],
  );

export const findByIdAndUser = (id, userId) =>
  pool.query('SELECT * FROM transfers WHERE id = $1 AND user_id = $2', [id, userId]);

export const insert = (id, userId, fromAccount, toAccount, amount, date, notes) =>
  pool.query(
    'INSERT INTO transfers (id, user_id, from_account, to_account, amount, date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, userId, fromAccount, toAccount, amount, date, notes],
  );

export const remove = (id, userId) =>
  pool.query('DELETE FROM transfers WHERE id = $1 AND user_id = $2', [id, userId]);
