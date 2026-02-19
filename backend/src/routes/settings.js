import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toSettings = (row) => {
  // Parse additional settings from JSONB if exists
  const additionalSettings = row.settings_json && typeof row.settings_json === 'object' ? row.settings_json : {};
  
  const base = {
    businessName: row.business_name || 'My Business',
    phone: row.phone ?? '',
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
    // Additional settings from JSONB
    emailNotifications: additionalSettings.emailNotifications ?? false,
    smsNotifications: additionalSettings.smsNotifications ?? false,
    autoSave: additionalSettings.autoSave ?? false,
    showCurrencySymbol: additionalSettings.showCurrencySymbol ?? true,
    dateFormat: additionalSettings.dateFormat || 'DD/MM/YYYY',
    numberFormat: additionalSettings.numberFormat || '1,234.56',
    invoiceAutoNumbering: additionalSettings.invoiceAutoNumbering ?? false,
    autoExport: additionalSettings.autoExport ?? false,
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

const hasSettingsJsonColumn = async () => {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'settings_json'`
  );
  return rows.length > 0;
};

router.put('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const d = req.body;
    const usePhone = await hasPhoneColumn();
    const useProfileAvatar = await hasProfileAvatarColumn();
    const useSettingsJson = await hasSettingsJsonColumn();
    const expenseCategoriesJson = d.expenseCategories ? JSON.stringify(d.expenseCategories) : null;

    // Prepare additional settings JSONB
    const additionalSettings = {
      emailNotifications: d.emailNotifications ?? false,
      smsNotifications: d.smsNotifications ?? false,
      autoSave: d.autoSave ?? false,
      showCurrencySymbol: d.showCurrencySymbol ?? true,
      dateFormat: d.dateFormat || 'DD/MM/YYYY',
      numberFormat: d.numberFormat || '1,234.56',
      invoiceAutoNumbering: d.invoiceAutoNumbering ?? false,
      autoExport: d.autoExport ?? false,
    };
    const settingsJson = useSettingsJson ? JSON.stringify(additionalSettings) : null;

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
      let paramIndex = 8;
      if (useProfileAvatar) {
        updateQuery += ` profile_avatar = COALESCE($${paramIndex}, profile_avatar),`;
        paramIndex++;
      }
      updateQuery += ` invoice_theme_color = COALESCE($${paramIndex}, invoice_theme_color),`;
      paramIndex++;
      updateQuery += ` opening_cash = COALESCE($${paramIndex}, opening_cash),`;
      paramIndex++;
      updateQuery += ` owner_capital = COALESCE($${paramIndex}, owner_capital),`;
      paramIndex++;
      updateQuery += ` payables = COALESCE($${paramIndex}, payables),`;
      paramIndex++;
      updateQuery += ` expense_categories = COALESCE($${paramIndex}, expense_categories),`;
      paramIndex++;
      if (useSettingsJson) {
        updateQuery += ` settings_json = COALESCE($${paramIndex}, settings_json),`;
        paramIndex++;
      }
      updateQuery += ` updated_at = NOW()
         WHERE user_id = $${paramIndex}`;
      
      const params = [
        d.businessName, d.phone != null ? d.phone : '', d.currency, d.taxRate != null ? d.taxRate : null, d.taxEnabled,
        d.theme, d.logo,
      ];
      if (useProfileAvatar) params.push(d.profileAvatar);
      params.push(invoiceThemeColor, d.openingCash, d.ownerCapital, d.payables, expenseCategoriesJson);
      if (useSettingsJson) params.push(settingsJson);
      params.push(uid);
      const { rowCount } = await pool.query(updateQuery, params);
      if (rowCount === 0) {
        let insertFields = ['user_id', 'business_name', 'phone', 'currency', 'tax_rate', 'tax_enabled', 'theme', 'logo'];
        let insertValues = [uid, d.businessName || 'My Business', d.phone || '', d.currency || 'LKR', d.taxRate ?? 10, d.taxEnabled ?? true, d.theme || 'dark', d.logo];
        let valuePlaceholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7', '$8'];
        let placeholderIndex = 9;
        
        if (useProfileAvatar) {
          insertFields.push('profile_avatar');
          insertValues.push(d.profileAvatar || null);
          valuePlaceholders.push(`$${placeholderIndex}`);
          placeholderIndex++;
        }
        insertFields.push('invoice_theme_color', 'opening_cash', 'owner_capital', 'payables', 'expense_categories');
        insertValues.push(invoiceThemeColor, d.openingCash ?? 0, d.ownerCapital ?? 0, d.payables ?? 0, expenseCategoriesJson || '["Hosting","Tools & Subscriptions","Advertising & Marketing","Transport","Office & Utilities","Other"]');
        valuePlaceholders.push(`$${placeholderIndex}`, `$${placeholderIndex + 1}`, `$${placeholderIndex + 2}`, `$${placeholderIndex + 3}`, `$${placeholderIndex + 4}`);
        placeholderIndex += 5;
        
        if (useSettingsJson) {
          insertFields.push('settings_json');
          insertValues.push(settingsJson);
          valuePlaceholders.push(`$${placeholderIndex}`);
        }
        
        await pool.query(
          `INSERT INTO settings (${insertFields.join(', ')})
           VALUES (${valuePlaceholders.join(', ')})`,
          insertValues
        );
      }
    } else {
      // No phone column
      let updateQuery = `UPDATE settings SET
          business_name = COALESCE($1, business_name),
          currency = COALESCE($2, currency),
          tax_rate = COALESCE($3, tax_rate),
          tax_enabled = COALESCE($4, tax_enabled),
          theme = COALESCE($5, theme),
          logo = COALESCE($6, logo),`;
      let paramIndex = 7;
      if (useProfileAvatar) {
        updateQuery += ` profile_avatar = COALESCE($${paramIndex}, profile_avatar),`;
        paramIndex++;
      }
      updateQuery += ` invoice_theme_color = COALESCE($${paramIndex}, invoice_theme_color),`;
      paramIndex++;
      updateQuery += ` opening_cash = COALESCE($${paramIndex}, opening_cash),`;
      paramIndex++;
      updateQuery += ` owner_capital = COALESCE($${paramIndex}, owner_capital),`;
      paramIndex++;
      updateQuery += ` payables = COALESCE($${paramIndex}, payables),`;
      paramIndex++;
      updateQuery += ` expense_categories = COALESCE($${paramIndex}, expense_categories),`;
      paramIndex++;
      if (useSettingsJson) {
        updateQuery += ` settings_json = COALESCE($${paramIndex}, settings_json),`;
        paramIndex++;
      }
      updateQuery += ` updated_at = NOW()
         WHERE user_id = $${paramIndex}`;
      
      const params = [
        d.businessName, d.currency, d.taxRate != null ? d.taxRate : null, d.taxEnabled,
        d.theme, d.logo,
      ];
      if (useProfileAvatar) params.push(d.profileAvatar);
      params.push(invoiceThemeColor, d.openingCash, d.ownerCapital, d.payables, expenseCategoriesJson);
      if (useSettingsJson) params.push(settingsJson);
      params.push(uid);
      
      const { rowCount } = await pool.query(updateQuery, params);
      if (rowCount === 0) {
        let insertFields = ['user_id', 'business_name', 'currency', 'tax_rate', 'tax_enabled', 'theme', 'logo'];
        let insertValues = [uid, d.businessName || 'My Business', d.currency || 'LKR', d.taxRate ?? 10, d.taxEnabled ?? true, d.theme || 'dark', d.logo];
        let valuePlaceholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7'];
        let placeholderIndex = 8;
        
        if (useProfileAvatar) {
          insertFields.push('profile_avatar');
          insertValues.push(d.profileAvatar || null);
          valuePlaceholders.push(`$${placeholderIndex}`);
          placeholderIndex++;
        }
        insertFields.push('invoice_theme_color', 'opening_cash', 'owner_capital', 'payables', 'expense_categories');
        insertValues.push(invoiceThemeColor, d.openingCash ?? 0, d.ownerCapital ?? 0, d.payables ?? 0, expenseCategoriesJson || '["Hosting","Tools & Subscriptions","Advertising & Marketing","Transport","Office & Utilities","Other"]');
        valuePlaceholders.push(`$${placeholderIndex}`, `$${placeholderIndex + 1}`, `$${placeholderIndex + 2}`, `$${placeholderIndex + 3}`, `$${placeholderIndex + 4}`);
        placeholderIndex += 5;
        
        if (useSettingsJson) {
          insertFields.push('settings_json');
          insertValues.push(settingsJson);
          valuePlaceholders.push(`$${placeholderIndex}`);
        }
        
        await pool.query(
          `INSERT INTO settings (${insertFields.join(', ')})
           VALUES (${valuePlaceholders.join(', ')})`,
          insertValues
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
