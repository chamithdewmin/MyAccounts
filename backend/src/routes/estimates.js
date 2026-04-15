import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

async function generateEstimateNumber(uid) {
  const year = new Date().getFullYear();
  const pattern = `EST-${year}-%`;
  const { rows } = await pool.query(
    'SELECT estimate_number FROM estimates WHERE user_id = $1 AND estimate_number LIKE $2 ORDER BY estimate_number DESC LIMIT 1',
    [uid, pattern]
  );
  let nextSeq = 1;
  if (rows[0]) {
    const match = rows[0].estimate_number.match(/-(\d{4})$/);
    if (match) nextSeq = parseInt(match[1], 10) + 1;
  }
  return `EST-${year}-${String(nextSeq).padStart(4, '0')}`;
}

const toEstimate = (row) => ({
  id: row.id,
  estimateNumber: row.estimate_number,
  clientId: row.client_id,
  clientName: row.client_name || '',
  clientEmail: row.client_email || '',
  clientPhone: row.client_phone || '',
  clientAddress: row.client_address || '',
  projectTitle: row.project_title || '',
  projectScope: row.project_scope || '',
  assumptions: row.assumptions || '',
  exclusions: row.exclusions || '',
  items: row.items || [],
  subtotal: parseFloat(row.subtotal) || 0,
  discountPercentage: parseFloat(row.discount_percentage) || 0,
  taxRate: parseFloat(row.tax_rate) || 0,
  taxAmount: parseFloat(row.tax_amount) || 0,
  total: parseFloat(row.total) || 0,
  validUntil: row.valid_until,
  status: row.status || 'draft',
  notes: row.notes || '',
  termsConditions: Array.isArray(row.terms_conditions) ? row.terms_conditions : [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

router.get('/', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const { rows } = await pool.query(
      'SELECT * FROM estimates WHERE user_id = $1 ORDER BY created_at DESC',
      [uid]
    );
    res.json(rows.map(toEstimate));
  } catch (err) {
    console.error('[estimates GET]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM estimates WHERE (id = $1 OR estimate_number = $1) AND user_id = $2',
      [id, uid]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Estimate not found' });
    res.json(toEstimate(rows[0]));
  } catch (err) {
    console.error('[estimates GET one]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const d = req.body || {};
    const estimateNumber = await generateEstimateNumber(uid);
    const subtotal = Number(d.subtotal) || 0;
    const discountPercentage = Math.min(100, Math.max(0, Number(d.discountPercentage) || 0));
    const discountAmount = subtotal * (discountPercentage / 100);
    const amountAfterDiscount = subtotal - discountAmount;
    const taxRate = Number(d.taxRate) || 0;
    const taxAmount = d.taxAmount != null ? Number(d.taxAmount) : amountAfterDiscount * (taxRate / 100);
    const total = Number(d.total) || amountAfterDiscount + taxAmount;
    const validUntil = d.validUntil || null;
    const createdAtVal = new Date().toISOString();

    await pool.query(
      `INSERT INTO estimates (
        id, estimate_number, user_id, client_id, client_name, client_email, client_phone, client_address,
        project_title, project_scope, assumptions, exclusions, items, subtotal, discount_percentage, tax_rate, tax_amount, total,
        valid_until, status, notes, terms_conditions, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
      [
        estimateNumber,
        estimateNumber,
        uid,
        d.clientId || null,
        d.clientName || '',
        d.clientEmail || '',
        d.clientPhone || '',
        d.clientAddress || '',
        d.projectTitle || '',
        d.projectScope || '',
        d.assumptions || '',
        d.exclusions || '',
        JSON.stringify(d.items || []),
        subtotal,
        discountPercentage,
        taxRate,
        taxAmount,
        total,
        validUntil,
        d.status || 'draft',
        d.notes || '',
        JSON.stringify(Array.isArray(d.termsConditions) ? d.termsConditions : []),
        createdAtVal,
        createdAtVal,
      ]
    );

    const { rows } = await pool.query('SELECT * FROM estimates WHERE id = $1 AND user_id = $2', [estimateNumber, uid]);
    res.status(201).json(toEstimate(rows[0]));
  } catch (err) {
    console.error('[estimates POST]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const { id } = req.params;
    const d = req.body || {};
    const subtotal = Number(d.subtotal) || 0;
    const discountPercentage = Math.min(100, Math.max(0, Number(d.discountPercentage) || 0));
    const discountAmount = subtotal * (discountPercentage / 100);
    const amountAfterDiscount = subtotal - discountAmount;
    const taxRate = Number(d.taxRate) || 0;
    const taxAmount = d.taxAmount != null ? Number(d.taxAmount) : amountAfterDiscount * (taxRate / 100);
    const total = Number(d.total) || amountAfterDiscount + taxAmount;

    const { rows } = await pool.query(
      `UPDATE estimates
       SET client_id = $3,
           client_name = $4,
           client_email = $5,
           client_phone = $6,
           client_address = $7,
           project_title = $8,
           project_scope = $9,
           assumptions = $10,
           exclusions = $11,
           items = $12,
           subtotal = $13,
           discount_percentage = $14,
           tax_rate = $15,
           tax_amount = $16,
           total = $17,
           valid_until = $18,
           status = $19,
           notes = $20,
           terms_conditions = $21,
           updated_at = NOW()
       WHERE (id = $1 OR estimate_number = $1) AND user_id = $2
       RETURNING *`,
      [
        id,
        uid,
        d.clientId || null,
        d.clientName || '',
        d.clientEmail || '',
        d.clientPhone || '',
        d.clientAddress || '',
        d.projectTitle || '',
        d.projectScope || '',
        d.assumptions || '',
        d.exclusions || '',
        JSON.stringify(d.items || []),
        subtotal,
        discountPercentage,
        taxRate,
        taxAmount,
        total,
        d.validUntil || null,
        d.status || 'draft',
        d.notes || '',
        JSON.stringify(Array.isArray(d.termsConditions) ? d.termsConditions : []),
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Estimate not found' });
    res.json(toEstimate(rows[0]));
  } catch (err) {
    console.error('[estimates PUT]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const { id } = req.params;
    const { status } = req.body || {};
    const { rows } = await pool.query(
      `UPDATE estimates
       SET status = $3, updated_at = NOW()
       WHERE (id = $1 OR estimate_number = $1) AND user_id = $2
       RETURNING *`,
      [id, uid, status || 'draft']
    );
    if (!rows[0]) return res.status(404).json({ error: 'Estimate not found' });
    res.json(toEstimate(rows[0]));
  } catch (err) {
    console.error('[estimates PATCH status]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/convert-to-invoice', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM estimates WHERE (id = $1 OR estimate_number = $1) AND user_id = $2',
      [id, uid]
    );
    const est = rows[0];
    if (!est) return res.status(404).json({ error: 'Estimate not found' });

    await pool.query(
      `UPDATE estimates
       SET status = 'converted', updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [est.id, uid]
    );

    res.json({ success: true, estimateId: est.id, message: 'Estimate marked as converted. Create invoice from UI payload.' });
  } catch (err) {
    console.error('[estimates convert]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const { rowCount } = await pool.query(
      'DELETE FROM estimates WHERE (id = $1 OR estimate_number = $1) AND user_id = $2',
      [req.params.id, uid]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Estimate not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[estimates DELETE]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
