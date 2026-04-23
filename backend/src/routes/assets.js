import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toAsset = (row) => ({
  id: row.id,
  name: row.name || 'Asset',
  amount: parseFloat(row.amount),
  date: row.date,
  createdAt: row.created_at,
});

router.get('/', async (req, res, next) => {
  try {
    const uid = req.user.dataUserId;
    const { rows } = await pool.query('SELECT * FROM assets WHERE user_id = $1 ORDER BY created_at DESC', [uid]);
    res.json(rows.map(toAsset));
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const uid = req.user.dataUserId;
    const d = req.body;
    const id = `AST-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await pool.query(
      'INSERT INTO assets (id, user_id, name, amount, date) VALUES ($1, $2, $3, $4, $5)',
      [id, uid, d.name || 'Asset', Number(d.amount) || 0, d.date || new Date().toISOString()]
    );
    const { rows } = await pool.query('SELECT * FROM assets WHERE id = $1', [id]);
    res.status(201).json(toAsset(rows[0]));
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const uid = req.user.dataUserId;
    const { rowCount } = await pool.query('DELETE FROM assets WHERE id = $1 AND user_id = $2', [req.params.id, uid]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
