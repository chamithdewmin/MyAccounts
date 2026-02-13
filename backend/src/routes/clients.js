import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toClient = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email || '',
  phone: row.phone || '',
  address: row.address || '',
  projects: row.projects || [],
  createdAt: row.created_at,
});

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clients ORDER BY created_at DESC');
    res.json(rows.map(toClient));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, projects } = req.body;
    const id = `CL-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await pool.query(
      'INSERT INTO clients (id, name, email, phone, address, projects) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, name?.trim() || '', email?.trim() || '', phone?.trim() || '', address?.trim() || '', JSON.stringify(projects || [])]
    );
    const { rows } = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    res.status(201).json(toClient(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address } = req.body;
    await pool.query(
      'UPDATE clients SET name = COALESCE($2, name), email = COALESCE($3, email), phone = COALESCE($4, phone), address = COALESCE($5, address) WHERE id = $1',
      [id, name, email, phone, address]
    );
    const { rows } = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(toClient(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
