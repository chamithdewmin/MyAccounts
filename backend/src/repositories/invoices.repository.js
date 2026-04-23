import pool from '../config/db.js';

export const findAllByUser = (userId) =>
  pool.query(
    `SELECT id, invoice_number, client_id, client_name, client_email, client_phone,
            items, total, discount_percentage, status, payment_method, due_date,
            notes, bank_details, show_signature_area, created_at
     FROM invoices WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );

export const findByIdOrNumber = (id, userId) =>
  pool.query(
    'SELECT * FROM invoices WHERE (id = $1 OR invoice_number = $1) AND user_id = $2',
    [id, userId],
  );

export const findById = (id) =>
  pool.query('SELECT * FROM invoices WHERE id = $1', [id]);

export const findByIdAndUser = (id, userId) =>
  pool.query('SELECT * FROM invoices WHERE id = $1 AND user_id = $2', [id, userId]);

export const findLastNumberByPattern = (userId, pattern) =>
  pool.query(
    'SELECT invoice_number FROM invoices WHERE user_id = $1 AND invoice_number LIKE $2 ORDER BY invoice_number DESC LIMIT 1',
    [userId, pattern],
  );

export const insert = (fields) =>
  pool.query(
    `INSERT INTO invoices (id, user_id, invoice_number, client_id, client_name, client_email, client_phone,
      items, subtotal, discount_percentage, tax_rate, tax_amount, total, payment_method, status,
      due_date, notes, bank_details_encrypted, show_signature_area, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    fields,
  );

export const update = (fields) =>
  pool.query(
    `UPDATE invoices SET client_id=$3, client_name=$4, client_email=$5, client_phone=$6,
     items=$7, subtotal=$8, discount_percentage=$9, tax_rate=$10, tax_amount=$11, total=$12,
     payment_method=$13, due_date=$14, notes=$15, bank_details_encrypted=$16,
     show_signature_area=$17, created_at=COALESCE($18, created_at)
     WHERE (id=$1 OR invoice_number=$1) AND user_id=$2 RETURNING *`,
    fields,
  );

export const updateStatus = (id, userId, status) =>
  pool.query(
    'UPDATE invoices SET status = $2 WHERE id = $1 AND user_id = $3',
    [id, status, userId],
  );

export const remove = (id, userId) =>
  pool.query('DELETE FROM invoices WHERE id = $1 AND user_id = $2', [id, userId]);
