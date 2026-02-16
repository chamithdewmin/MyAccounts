import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { encrypt, decrypt } from '../lib/crypto.js';

const router = express.Router();
router.use(authMiddleware);

const parseBankDetails = (encrypted) => {
  if (!encrypted) return null;
  const raw = decrypt(encrypted);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return obj && (obj.accountNumber || obj.accountName || obj.bankName) ? obj : null;
  } catch {
    return null;
  }
};

const toSettings = (row) => {
  const base = {
    businessName: row.business_name || 'My Business',
    phone: (row && (row.phone ?? '')) || '',
    currency: row.currency || 'LKR',
    taxRate: parseFloat(row.tax_rate) || 10,
    taxEnabled: row.tax_enabled ?? true,
    theme: row.theme || 'dark',
    logo: row.logo,
    openingCash: parseFloat(row.opening_cash) || 0,
    ownerCapital: parseFloat(row.owner_capital) || 0,
    payables: parseFloat(row.payables) || 0,
    expenseCategories: row.expense_categories || ['Hosting', 'Tools & Subscriptions', 'Advertising & Marketing', 'Transport', 'Office & Utilities', 'Other'],
  };
  if (row.bank_details_encrypted) {
    base.bankDetails = parseBankDetails(row.bank_details_encrypted);
  } else {
    base.bankDetails = null;
  }
  return base;
};

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query('SELECT * FROM settings WHERE user_id = $1', [uid]);
    if (!rows[0]) {
      await pool.query(
        `INSERT INTO settings (user_id, business_name) VALUES ($1, 'My Business')`,
        [uid]
      );
      const { rows: r } = await pool.query('SELECT * FROM settings WHERE user_id = $1', [uid]);
      return res.json(toSettings(r[0]));
    }
    res.json(toSettings(rows[0]));
  } catch (err) {
    console.error('[settings GET]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const hasPhoneColumn = async () => {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'phone'`
  );
  return rows.length > 0;
};

router.put('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const d = req.body;
    const usePhone = await hasPhoneColumn();
    const expenseCategoriesJson = d.expenseCategories ? JSON.stringify(d.expenseCategories) : null;

    if (usePhone) {
      const params = [
        d.businessName, d.phone != null ? d.phone : '', d.currency, d.taxRate != null ? d.taxRate : null, d.taxEnabled,
        d.theme, d.logo, d.openingCash, d.ownerCapital, d.payables,
        expenseCategoriesJson, uid,
      ];
      const { rowCount } = await pool.query(
        `UPDATE settings SET
          business_name = COALESCE($1, business_name),
          phone = COALESCE($2, phone),
          currency = COALESCE($3, currency),
          tax_rate = COALESCE($4, tax_rate),
          tax_enabled = COALESCE($5, tax_enabled),
          theme = COALESCE($6, theme),
          logo = COALESCE($7, logo),
          opening_cash = COALESCE($8, opening_cash),
          owner_capital = COALESCE($9, owner_capital),
          payables = COALESCE($10, payables),
          expense_categories = COALESCE($11, expense_categories),
          updated_at = NOW()
         WHERE user_id = $12`,
        params
      );
      if (rowCount === 0) {
        await pool.query(
          `INSERT INTO settings (user_id, business_name, phone, currency, tax_rate, tax_enabled, theme, logo, opening_cash, owner_capital, payables, expense_categories)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [uid, d.businessName || 'My Business', d.phone || '', d.currency || 'LKR', d.taxRate ?? 10, d.taxEnabled ?? true, d.theme || 'dark', d.logo, d.openingCash ?? 0, d.ownerCapital ?? 0, d.payables ?? 0, expenseCategoriesJson || '["Hosting","Tools & Subscriptions","Advertising & Marketing","Transport","Office & Utilities","Other"]']
        );
      }
    } else {
      const params = [
        d.businessName, d.currency, d.taxRate != null ? d.taxRate : null, d.taxEnabled,
        d.theme, d.logo, d.openingCash, d.ownerCapital, d.payables,
        expenseCategoriesJson, uid,
      ];
      const { rowCount } = await pool.query(
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
         WHERE user_id = $11`,
        params
      );
      if (rowCount === 0) {
        await pool.query(
          `INSERT INTO settings (user_id, business_name, currency, tax_rate, tax_enabled, theme, logo, opening_cash, owner_capital, payables, expense_categories)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [uid, d.businessName || 'My Business', d.currency || 'LKR', d.taxRate ?? 10, d.taxEnabled ?? true, d.theme || 'dark', d.logo, d.openingCash ?? 0, d.ownerCapital ?? 0, d.payables ?? 0, expenseCategoriesJson || '["Hosting","Tools & Subscriptions","Advertising & Marketing","Transport","Office & Utilities","Other"]']
        );
      }
    }
    if (d.bankDetails != null) {
      const hasBankCol = await pool.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'bank_details_encrypted'`
      );
      if (hasBankCol.rows.length > 0) {
        const { rows: existingRows } = await pool.query(
          'SELECT bank_details_encrypted FROM settings WHERE user_id = $1',
          [uid]
        );
        const existing = existingRows[0]?.bank_details_encrypted
          ? parseBankDetails(existingRows[0].bank_details_encrypted)
          : {};
        const bank = { ...existing, ...d.bankDetails };
        const toEncrypt =
          bank && (bank.accountNumber || bank.accountName || bank.bankName)
            ? JSON.stringify({
                accountNumber: String(bank.accountNumber || '').trim(),
                accountName: String(bank.accountName || '').trim(),
                bankName: String(bank.bankName || '').trim(),
                branch: String(bank.branch || '').trim() || null,
              })
            : null;
        const encrypted = toEncrypt ? encrypt(toEncrypt) : null;
        await pool.query(
          'UPDATE settings SET bank_details_encrypted = $2, updated_at = NOW() WHERE user_id = $1',
          [uid, encrypted]
        );
      }
    }
    const { rows } = await pool.query('SELECT * FROM settings WHERE user_id = $1', [uid]);
    res.json(toSettings(rows[0]));
  } catch (err) {
    console.error('[settings PUT]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
