import pool from '../config/db.js';

export const findAll = () =>
  pool.query(
    `SELECT id, email, name, role, created_at,
            COALESCE(is_blocked, false) AS is_blocked,
            token_version
     FROM users ORDER BY created_at DESC`,
  );

export const findById = (id) =>
  pool.query(
    'SELECT id, email, name, role, created_at, COALESCE(is_blocked, false) AS is_blocked, token_version FROM users WHERE id = $1',
    [id],
  );

export const findByEmail = (email) =>
  pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);

export const insert = (email, passwordHash, name, role) =>
  pool.query(
    'INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,$4) RETURNING id, email, name, role, created_at',
    [email, passwordHash, name, role],
  );

export const update = (id, fields) => {
  const sets = Object.entries(fields).map(([k, _], i) => `${k} = $${i + 2}`).join(', ');
  return pool.query(`UPDATE users SET ${sets} WHERE id = $1 RETURNING *`, [id, ...Object.values(fields)]);
};

export const setBlocked = (id, isBlocked) =>
  pool.query('UPDATE users SET is_blocked = $2 WHERE id = $1', [id, isBlocked]);

export const remove = (id) =>
  pool.query('DELETE FROM users WHERE id = $1', [id]);

export const incrementTokenVersion = (id) =>
  pool.query('UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = $1', [id]);
