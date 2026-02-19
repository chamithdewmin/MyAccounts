import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toSettings = (row) => {
  const base = {
    businessName: row.business_name || 'My Business',
    phone: (row && (row.phone ?? '')) || '',
    currency: row.currency || 'LKR',
    taxRate: parseFloat(row.tax_rate) || 10,
    taxEnabled: row.tax_enabled ?? true,
    theme: row.theme || 'dark',
    logo: row.logo,
    profileAvatar: row.profile_avatar || null,
    invoiceThemeColor: row.invoice_theme_color || '#F97316',
    openingCash: parseFloat(row.opening_cash) || 0,
    ownerCapital: parseFloat(row.owner_capital) || 0,
    payables: parseFloat(row.payables) || 0,
    expenseCategories: row.expense_categories || ['Hosting', 'Tools & Subscriptions', 'Advertising & Marketing', 'Transport', 'Office & Utilities', 'Other'],
  };
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

const hasProfileAvatarColumn = async () => {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'profile_avatar'`
  );
  return rows.length > 0;
};

router.put('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const d = req.body;
    const usePhone = await hasPhoneColumn();
    const useProfileAvatar = await hasProfileAvatarColumn();
    const expenseCategoriesJson = d.expenseCategories ? JSON.stringify(d.expenseCategories) : null;

    const invoiceThemeColor = (d.invoiceThemeColor || '#F97316').toString().trim().slice(0, 20);
    if (usePhone) {
      let params;
      let updateQuery = `UPDATE settings SET
          business_name = COALESCE($1, business_name),
          phone = COALESCE($2, phone),
          currency = COALESCE($3, currency),
          tax_rate = COALESCE($4, tax_rate),
          tax_enabled = COALESCE($5, tax_enabled),
          theme = COALESCE($6, theme),
          logo = COALESCE($7, logo),`;
      if (useProfileAvatar) {
        params = [
          d.businessName, d.phone != null ? d.phone : '', d.currency, d.taxRate != null ? d.taxRate : null, d.taxEnabled,
          d.theme, d.logo, d.profileAvatar, invoiceThemeColor, d.openingCash, d.ownerCapital, d.payables,
          expenseCategoriesJson, uid,
        ];
        updateQuery += ` profile_avatar = COALESCE($8, profile_avatar),`;
        updateQuery += ` invoice_theme_color = COALESCE($9, invoice_theme_color),
          opening_cash = COALESCE($10, opening_cash),
          owner_capital = COALESCE($11, owner_capital),
          payables = COALESCE($12, payables),
          expense_categories = COALESCE($13, expense_categories),
          updated_at = NOW()
         WHERE user_id = $14`;
      } else {
        params = [
          d.businessName, d.phone != null ? d.phone : '', d.currency, d.taxRate != null ? d.taxRate : null, d.taxEnabled,
          d.theme, d.logo, invoiceThemeColor, d.openingCash, d.ownerCapital, d.payables,
          expenseCategoriesJson, uid,
        ];
        updateQuery += ` invoice_theme_color = COALESCE($8, invoice_theme_color),
          opening_cash = COALESCE($9, opening_cash),
          owner_capital = COALESCE($10, owner_capital),
          payables = COALESCE($11, payables),
          expense_categories = COALESCE($12, expense_categories),
          updated_at = NOW()
         WHERE user_id = $13`;
      }
      const { rowCount } = await pool.query(updateQuery, params);
      if (rowCount === 0) {
        if (useProfileAvatar) {
          await pool.query(
            `INSERT INTO settings (user_id, business_name, phone, currency, tax_rate, tax_enabled, theme, logo, profile_avatar, invoice_theme_color, opening_cash, owner_capital, payables, expense_categories)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [uid, d.businessName || 'My Business', d.phone || '', d.currency || 'LKR', d.taxRate ?? 10, d.taxEnabled ?? true, d.theme || 'dark', d.logo, d.profileAvatar || null, invoiceThemeColor, d.openingCash ?? 0, d.ownerCapital ?? 0, d.payables ?? 0, expenseCategoriesJson || '["Hosting","Tools & Subscriptions","Advertising & Marketing","Transport","Office & Utilities","Other"]']
          );
        } else {
          await pool.query(
            `INSERT INTO settings (user_id, business_name, phone, currency, tax_rate, tax_enabled, theme, logo, invoice_theme_color, opening_cash, owner_capital, payables, expense_categories)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [uid, d.businessName || 'My Business', d.phone || '', d.currency || 'LKR', d.taxRate ?? 10, d.taxEnabled ?? true, d.theme || 'dark', d.logo, invoiceThemeColor, d.openingCash ?? 0, d.ownerCapital ?? 0, d.payables ?? 0, expenseCategoriesJson || '["Hosting","Tools & Subscriptions","Advertising & Marketing","Transport","Office & Utilities","Other"]']
          );
        }
      }
    } else {
      let params;
      let updateQuery = `UPDATE settings SET
          business_name = COALESCE($1, business_name),
          currency = COALESCE($2, currency),
          tax_rate = COALESCE($3, tax_rate),
          tax_enabled = COALESCE($4, tax_enabled),
          theme = COALESCE($5, theme),
          logo = COALESCE($6, logo),`;
      if (useProfileAvatar) {
        params = [
          d.businessName, d.currency, d.taxRate != null ? d.taxRate : null, d.taxEnabled,
          d.theme, d.logo, d.profileAvatar, invoiceThemeColor, d.openingCash, d.ownerCapital, d.payables,
          expenseCategoriesJson, uid,
        ];
        updateQuery += ` profile_avatar = COALESCE($7, profile_avatar),`;
        updateQuery += ` invoice_theme_color = COALESCE($8, invoice_theme_color),
          opening_cash = COALESCE($9, opening_cash),
          owner_capital = COALESCE($10, owner_capital),
          payables = COALESCE($11, payables),
          expense_categories = COALESCE($12, expense_categories),
          updated_at = NOW()
         WHERE user_id = $13`;
      } else {
        params = [
          d.businessName, d.currency, d.taxRate != null ? d.taxRate : null, d.taxEnabled,
          d.theme, d.logo, invoiceThemeColor, d.openingCash, d.ownerCapital, d.payables,
          expenseCategoriesJson, uid,
        ];
        updateQuery += ` invoice_theme_color = COALESCE($7, invoice_theme_color),
          opening_cash = COALESCE($8, opening_cash),
          owner_capital = COALESCE($9, owner_capital),
          payables = COALESCE($10, payables),
          expense_categories = COALESCE($11, expense_categories),
          updated_at = NOW()
         WHERE user_id = $12`;
      }
      const { rowCount } = await pool.query(updateQuery, params);
      if (rowCount === 0) {
        if (useProfileAvatar) {
          await pool.query(
            `INSERT INTO settings (user_id, business_name, currency, tax_rate, tax_enabled, theme, logo, profile_avatar, invoice_theme_color, opening_cash, owner_capital, payables, expense_categories)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [uid, d.businessName || 'My Business', d.currency || 'LKR', d.taxRate ?? 10, d.taxEnabled ?? true, d.theme || 'dark', d.logo, d.profileAvatar || null, invoiceThemeColor, d.openingCash ?? 0, d.ownerCapital ?? 0, d.payables ?? 0, expenseCategoriesJson || '["Hosting","Tools & Subscriptions","Advertising & Marketing","Transport","Office & Utilities","Other"]']
          );
        } else {
          await pool.query(
            `INSERT INTO settings (user_id, business_name, currency, tax_rate, tax_enabled, theme, logo, invoice_theme_color, opening_cash, owner_capital, payables, expense_categories)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [uid, d.businessName || 'My Business', d.currency || 'LKR', d.taxRate ?? 10, d.taxEnabled ?? true, d.theme || 'dark', d.logo, invoiceThemeColor, d.openingCash ?? 0, d.ownerCapital ?? 0, d.payables ?? 0, expenseCategoriesJson || '["Hosting","Tools & Subscriptions","Advertising & Marketing","Transport","Office & Utilities","Other"]']
          );
        }
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
