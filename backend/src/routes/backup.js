import express from 'express';
import pool from '../config/db.js';
import { authenticateToken, getUserId } from './auth.js';

const router = express.Router();

// Tables to backup (user-specific data)
const BACKUP_TABLES = [
  'clients',
  'incomes',
  'expenses',
  'invoices',
  'assets',
  'loans',
  'transfers',
  'reminders',
  'orders',
  'customers',
  'cars',
];

// GET /api/backup - Download backup as JSON
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const backup = {
      version: '1.0',
      created_at: new Date().toISOString(),
      user_id: userId,
      tables: {},
    };

    // Export each table for this user
    for (const table of BACKUP_TABLES) {
      try {
        const result = await pool.query(
          `SELECT * FROM ${table} WHERE user_id = $1`,
          [userId]
        );
        backup.tables[table] = result.rows;
      } catch (err) {
        // Table might not exist or have user_id column
        console.log(`Skipping table ${table}: ${err.message}`);
        backup.tables[table] = [];
      }
    }

    // Also backup settings
    try {
      const settingsResult = await pool.query(
        'SELECT * FROM settings WHERE user_id = $1',
        [userId]
      );
      backup.tables.settings = settingsResult.rows;
    } catch (err) {
      backup.tables.settings = [];
    }

    // Generate filename with date
    const date = new Date();
    const filename = `MyAccounts_Backup_${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}_${String(date.getDate()).padStart(2, '0')}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(backup);
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// GET /api/backup/info - Get last backup info
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    
    // Count records in each table
    const counts = {};
    for (const table of BACKUP_TABLES) {
      try {
        const result = await pool.query(
          `SELECT COUNT(*) FROM ${table} WHERE user_id = $1`,
          [userId]
        );
        counts[table] = parseInt(result.rows[0].count, 10);
      } catch (err) {
        counts[table] = 0;
      }
    }

    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

    res.json({
      tables: counts,
      totalRecords,
      lastBackup: null, // Could store this in settings if needed
    });
  } catch (err) {
    console.error('Backup info error:', err);
    res.status(500).json({ error: 'Failed to get backup info' });
  }
});

// POST /api/backup/restore - Restore from backup
router.post('/restore', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = getUserId(req);
    const backup = req.body;

    // Validate backup format
    if (!backup || !backup.version || !backup.tables) {
      return res.status(400).json({ error: 'Invalid backup file format' });
    }

    await client.query('BEGIN');

    // Clear existing data for this user (in reverse order to handle foreign keys)
    const tablesToClear = [...BACKUP_TABLES].reverse();
    for (const table of tablesToClear) {
      try {
        await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
      } catch (err) {
        console.log(`Could not clear table ${table}: ${err.message}`);
      }
    }

    // Restore data from backup
    let restoredCount = 0;
    for (const [table, rows] of Object.entries(backup.tables)) {
      if (table === 'settings' || !Array.isArray(rows) || rows.length === 0) continue;
      if (!BACKUP_TABLES.includes(table)) continue;

      for (const row of rows) {
        try {
          // Update user_id to current user
          row.user_id = userId;
          
          // Remove id to let DB generate new ones (avoid conflicts)
          const { id, ...rowData } = row;
          
          const columns = Object.keys(rowData);
          const values = Object.values(rowData);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          
          await client.query(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          );
          restoredCount++;
        } catch (err) {
          console.log(`Error restoring row in ${table}: ${err.message}`);
        }
      }
    }

    // Restore settings if present
    if (backup.tables.settings && backup.tables.settings.length > 0) {
      const settingsRow = backup.tables.settings[0];
      const { id, user_id, ...settingsData } = settingsRow;
      
      for (const [key, value] of Object.entries(settingsData)) {
        if (value !== null && value !== undefined) {
          try {
            await client.query(
              `UPDATE settings SET ${key} = $1 WHERE user_id = $2`,
              [value, userId]
            );
          } catch (err) {
            // Column might not exist
          }
        }
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Restored ${restoredCount} records successfully`,
      restoredCount,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Restore error:', err);
    res.status(500).json({ error: 'Failed to restore backup: ' + err.message });
  } finally {
    client.release();
  }
});

export default router;
