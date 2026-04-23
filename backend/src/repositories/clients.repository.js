import pool from '../config/db.js';

export const findAllByUser = (userId) =>
  pool.query(
    'SELECT id, name, email, phone, address, created_at FROM clients WHERE user_id = $1 ORDER BY name ASC',
    [userId],
  );

export const findById = (id) =>
  pool.query('SELECT * FROM clients WHERE id = $1', [id]);

export const findByIdAndUser = (id, userId) =>
  pool.query('SELECT * FROM clients WHERE id = $1 AND user_id = $2', [id, userId]);

export const insert = (id, userId, name, email, phone, address, projects) =>
  pool.query(
    'INSERT INTO clients (id, user_id, name, email, phone, address, projects) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, userId, name, email, phone, address, JSON.stringify(projects || [])],
  );

export const update = (id, userId, { name, email, phone, address }) =>
  pool.query(
    'UPDATE clients SET name = COALESCE($2, name), email = COALESCE($3, email), phone = COALESCE($4, phone), address = COALESCE($5, address) WHERE id = $1 AND user_id = $6',
    [id, name, email, phone, address, userId],
  );

export const remove = (id, userId) =>
  pool.query('DELETE FROM clients WHERE id = $1 AND user_id = $2', [id, userId]);
