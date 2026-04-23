import pool from '../config/db.js';

export const findAllByUser = (userId) =>
  pool.query(
    'SELECT * FROM estimates WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  );

export const findByIdOrNumber = (id, userId) =>
  pool.query(
    'SELECT * FROM estimates WHERE (id = $1 OR estimate_number = $1) AND user_id = $2',
    [id, userId],
  );

export const findByIdAndUser = (id, userId) =>
  pool.query('SELECT * FROM estimates WHERE id = $1 AND user_id = $2', [id, userId]);

export const findLastNumberByPattern = (userId, pattern) =>
  pool.query(
    'SELECT estimate_number FROM estimates WHERE user_id = $1 AND estimate_number LIKE $2 ORDER BY estimate_number DESC LIMIT 1',
    [userId, pattern],
  );

export const insert = (fields) =>
  pool.query(
    `INSERT INTO estimates (id, user_id, estimate_number, client_id, client_name, client_email, client_phone,
      items, subtotal, discount_percentage, tax_rate, tax_amount, total, status, valid_until, notes,
      project_title, show_signature_area, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    fields,
  );

export const update = (fields) =>
  pool.query(
    `UPDATE estimates SET client_id=$3, client_name=$4, client_email=$5, client_phone=$6,
     items=$7, subtotal=$8, discount_percentage=$9, tax_rate=$10, tax_amount=$11, total=$12,
     valid_until=$13, notes=$14, project_title=$15, show_signature_area=$16,
     created_at=COALESCE($17, created_at)
     WHERE (id=$1 OR estimate_number=$1) AND user_id=$2 RETURNING *`,
    fields,
  );

export const updateStatus = (id, userId, status) =>
  pool.query('UPDATE estimates SET status = $2 WHERE id = $1 AND user_id = $3', [id, status, userId]);

export const remove = (id, userId) =>
  pool.query('DELETE FROM estimates WHERE id = $1 AND user_id = $2', [id, userId]);
