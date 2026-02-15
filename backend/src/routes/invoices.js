import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toInvoice = (row) => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  clientId: row.client_id,
  clientName: row.client_name || '',
  clientEmail: row.client_email || '',
  clientPhone: row.client_phone || '',
  items: row.items || [],
  subtotal: parseFloat(row.subtotal),
  taxRate: parseFloat(row.tax_rate),
  taxAmount: parseFloat(row.tax_amount),
  total: parseFloat(row.total),
  paymentMethod: row.payment_method || 'bank',
  status: row.status || 'unpaid',
  dueDate: row.due_date,
  notes: row.notes || '',
  createdAt: row.created_at,
});

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query('SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC', [uid]);
    res.json(rows.map(toInvoice));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const d = req.body;
    const id = d.invoiceNumber || d.id || `INV-${Date.now()}`;
    const subtotal = Number(d.subtotal) || 0;
    const taxRate = Number(d.taxRate) ?? 10;
    const taxAmount = d.taxAmount != null ? Number(d.taxAmount) : subtotal * (taxRate / 100);
    const total = Number(d.total) || subtotal + taxAmount;

    await pool.query(
      `INSERT INTO invoices (id, user_id, invoice_number, client_id, client_name, client_email, client_phone, items, subtotal, tax_rate, tax_amount, total, payment_method, status, due_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        id,
        uid,
        d.invoiceNumber || id,
        d.clientId || null,
        d.clientName || '',
        d.clientEmail || '',
        d.clientPhone || '',
        JSON.stringify(d.items || []),
        subtotal,
        taxRate,
        taxAmount,
        total,
        d.paymentMethod || 'bank',
        d.status || 'unpaid',
        d.dueDate || null,
        d.notes || '',
      ]
    );
    const { rows } = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
    res.status(201).json(toInvoice(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const uid = req.user.id;
    const { id } = req.params;
    const { status } = req.body;
    await pool.query('UPDATE invoices SET status = $2 WHERE id = $1 AND user_id = $3', [id, status, uid]);
    const { rows } = await pool.query('SELECT * FROM invoices WHERE id = $1 AND user_id = $2', [id, uid]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(toInvoice(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rowCount } = await pool.query('DELETE FROM invoices WHERE id = $1 AND user_id = $2', [req.params.id, uid]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
