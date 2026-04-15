import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { isAdminRequest } from '../lib/dataScope.js';

const router = express.Router();
router.use(authMiddleware);

const requireAdmin = (req, res, next) => {
  if (!isAdminRequest(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const TABLES = [
  'users',
  'clients',
  'incomes',
  'expenses',
  'invoices',
  'assets',
  'loans',
  'cars',
  'customers',
  'orders',
  'transfers',
  'reminders',
  'settings',
  'bank_details',
];

router.get('/info', requireAdmin, async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT current_database()');
    const dbName = dbResult.rows[0]?.current_database || 'unknown';

    const lastBackupResult = await pool.query(`
      SELECT * FROM backup_history 
      ORDER BY created_at DESC 
      LIMIT 1
    `).catch(() => ({ rows: [] }));

    const lastBackup = lastBackupResult.rows[0] || null;

    const tablesInfo = [];
    for (const table of TABLES) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        tablesInfo.push({
          name: table,
          rows: parseInt(countResult.rows[0]?.count || 0, 10),
        });
      } catch (e) {
        tablesInfo.push({ name: table, rows: 0, error: e.message });
      }
    }

    res.json({
      databaseName: dbName,
      lastBackup: lastBackup
        ? {
            id: lastBackup.id,
            filename: lastBackup.filename,
            size: lastBackup.size_bytes,
            createdAt: lastBackup.created_at,
          }
        : null,
      tables: tablesInfo,
      totalTables: tablesInfo.length,
    });
  } catch (err) {
    console.error('Backup info error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, filename, size_bytes, tables_count, rows_count, created_at, status
      FROM backup_history 
      ORDER BY created_at DESC 
      LIMIT 20
    `).catch(() => ({ rows: [] }));

    res.json(result.rows);
  } catch (err) {
    console.error('Backup history error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/create', requireAdmin, async (req, res) => {
  try {
    const backupData = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      tables: {},
    };

    let totalRows = 0;

    for (const table of TABLES) {
      try {
        const result = await pool.query(`SELECT * FROM ${table}`);
        backupData.tables[table] = result.rows;
        totalRows += result.rows.length;
      } catch (e) {
        backupData.tables[table] = [];
      }
    }

    const backupJson = JSON.stringify(backupData, null, 2);
    const sizeBytes = Buffer.byteLength(backupJson, 'utf8');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `MyAccounts_Backup_${timestamp}.json`;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS backup_history (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        size_bytes INT NOT NULL,
        tables_count INT DEFAULT 0,
        rows_count INT DEFAULT 0,
        backup_data TEXT,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const insertResult = await pool.query(
      `INSERT INTO backup_history (filename, size_bytes, tables_count, rows_count, backup_data, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [filename, sizeBytes, Object.keys(backupData.tables).length, totalRows, backupJson, 'completed']
    );

    res.json({
      success: true,
      backup: {
        id: insertResult.rows[0].id,
        filename,
        size: sizeBytes,
        tablesCount: Object.keys(backupData.tables).length,
        rowsCount: totalRows,
        createdAt: insertResult.rows[0].created_at,
      },
    });
  } catch (err) {
    console.error('Backup create error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/download/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT filename, backup_data FROM backup_history WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const { filename, backup_data } = result.rows[0];

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(backup_data);
  } catch (err) {
    console.error('Backup download error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/restore', requireAdmin, async (req, res) => {
  try {
    const { backupData } = req.body;

    if (!backupData || !backupData.tables) {
      return res.status(400).json({ error: 'Invalid backup data format' });
    }

    const results = {
      restored: [],
      skipped: [],
      errors: [],
    };

    for (const [tableName, rows] of Object.entries(backupData.tables)) {
      if (!TABLES.includes(tableName)) {
        results.skipped.push({ table: tableName, reason: 'Not a valid table' });
        continue;
      }

      try {
        await pool.query(`DELETE FROM ${tableName}`);

        let insertedCount = 0;
        for (const row of rows) {
          if (Object.keys(row).length === 0) continue;

          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

          await pool.query(
            `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})
             ON CONFLICT DO NOTHING`,
            values
          );
          insertedCount++;
        }

        results.restored.push({ table: tableName, rows: insertedCount });
      } catch (e) {
        results.errors.push({ table: tableName, error: e.message });
      }
    }

    res.json({
      success: true,
      message: 'Restore completed',
      results,
    });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM backup_history WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Backup delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
