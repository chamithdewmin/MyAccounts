import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { isAdminRequest } from '../lib/dataScope.js';

const PROTECTED_EMAIL = 'logozodev@gmail.com';

const router = express.Router();
router.use(authMiddleware);
router.use((req, res, next) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: 'Forbidden' });
  next();
});

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, role, created_at, COALESCE(is_blocked, false) AS is_blocked FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    const r = String(role || 'staff').toLowerCase() === 'admin' ? 'admin' : 'staff';
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at`,
      [email.trim(), hash, name.trim(), r]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error(err);
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, is_blocked } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    const { rows: existing } = await pool.query('SELECT email FROM users WHERE id = $1', [id]);
    if (!existing[0]) return res.status(404).json({ error: 'User not found' });
    if (
      String(existing[0].email).toLowerCase().trim() === PROTECTED_EMAIL.toLowerCase().trim() &&
      is_blocked === true
    ) {
      return res.status(403).json({ error: 'This account cannot be blocked' });
    }
    let query = 'UPDATE users SET name = $2, email = $3';
    const params = [id, name.trim(), email.trim()];
    if (password && password.trim()) {
      const hash = await bcrypt.hash(password, 10);
      query += ', password_hash = $4';
      params.push(hash);
    }
    if (role != null && String(role).trim() !== '') {
      const r = String(role).toLowerCase() === 'admin' ? 'admin' : 'staff';
      query += `, role = $${params.length + 1}`;
      params.push(r);
    }
    if (typeof is_blocked === 'boolean') {
      query += `, is_blocked = $${params.length + 1}`;
      params.push(is_blocked);
      if (is_blocked === true) {
        query += `, token_version = COALESCE(token_version, 0) + 1`;
      }
    }
    query += ' WHERE id = $1 RETURNING id, email, name, role, created_at, COALESCE(is_blocked, false) AS is_blocked';
    const { rows } = await pool.query(query, params);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error(err);
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID' });
    const { rows } = await pool.query('SELECT email FROM users WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    if (rows[0].email === PROTECTED_EMAIL) {
      return res.status(403).json({ error: 'This account cannot be deleted' });
    }
    const userEmail = rows[0].email;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tables = ['orders', 'incomes', 'invoices', 'clients', 'customers', 'expenses', 'cars', 'assets', 'loans', 'transfers', 'reminders', 'settings'];
      for (const table of tables) {
        await client.query('SAVEPOINT del_user');
        try {
          await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [id]);
        } catch (tErr) {
          await client.query('ROLLBACK TO SAVEPOINT del_user');
          if (tErr.code !== '42P01' && tErr.code !== '42703') throw tErr;
        }
      }
      await client.query('SAVEPOINT del_user');
      try {
        await client.query('DELETE FROM password_reset_otps WHERE email = $1', [userEmail]);
      } catch {
        await client.query('ROLLBACK TO SAVEPOINT del_user');
      }
      const { rowCount } = await client.query('DELETE FROM users WHERE id = $1', [id]);
      if (rowCount === 0) throw new Error('User delete failed');
      await client.query('COMMIT');
    } catch (txErr) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
      throw txErr;
    } finally {
      client.release();
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
