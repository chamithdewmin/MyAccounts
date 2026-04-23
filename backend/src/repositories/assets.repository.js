import pool from '../config/db.js';

export const findAllByUser = (userId) =>
  pool.query('SELECT * FROM assets WHERE user_id = $1 ORDER BY created_at DESC', [userId]);

export const insert = (id, userId, d) =>
  pool.query(
    'INSERT INTO assets (id, user_id, name, value, category, description, purchase_date) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, userId, d.name || '', Number(d.value) || 0, d.category || '', d.description || '', d.purchaseDate || null],
  );

export const remove = (id, userId) =>
  pool.query('DELETE FROM assets WHERE id = $1 AND user_id = $2', [id, userId]);
