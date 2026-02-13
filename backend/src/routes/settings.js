import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toSettings = (row) => ({
  businessName: row.business_name || 'My Business',
  currency: row.currency || 'LKR',
  taxRate: parseFloat(row.tax_rate) || 10,
  taxEnabled: row.tax_enabled ?? true,
  theme: row.theme || 'dark',
  logo: row.logo,
  openingCash: parseFloat(row.opening_cash) || 0,
  ownerCapital: parseFloat(row.owner_capital) || 0,
  payables: parseFloat(row.payables) || 0,
  expenseCategories: row.expense_categories || ['Hosting', 'Tools & Subscriptions', 'Advertising & Marketing', 'Transport', 'Office & Utilities', 'Other'],
});

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM settings WHERE id = 1');
    if (!rows[0]) {
      await pool.query(`INSERT INTO settings (id) VALUES (1)`);
      const { rows: r } = await pool.query('SELECT * FROM settings WHERE id = 1');
      return res.json(toSettings(r[0]));
    }
    res.json(toSettings(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/', async (req, res) => {
  try {
    const d = req.body;
    const params = [
      d.businessName, d.currency, d.taxRate != null ? d.taxRate : null, d.taxEnabled,
      d.theme, d.logo, d.openingCash, d.ownerCapital, d.payables,
      d.expenseCategories ? JSON.stringify(d.expenseCategories) : null,
    ];
    await pool.query(
      `UPDATE settings SET
        business_name = COALESCE($1, business_name),
        currency = COALESCE($2, currency),
        tax_rate = COALESCE($3, tax_rate),
        tax_enabled = COALESCE($4, tax_enabled),
        theme = COALESCE($5, theme),
        logo = COALESCE($6, logo),
        opening_cash = COALESCE($7, opening_cash),
        owner_capital = COALESCE($8, owner_capital),
        payables = COALESCE($9, payables),
        expense_categories = COALESCE($10, expense_categories),
        updated_at = NOW()
       WHERE id = 1`,
      params
    );
    const { rows } = await pool.query('SELECT * FROM settings WHERE id = 1');
    res.json(toSettings(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
