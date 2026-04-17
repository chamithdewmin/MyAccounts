import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { isAdminRequest } from '../lib/dataScope.js';

const router = express.Router();
router.use(authMiddleware);

const quotaBytes = () => {
  const gb = Number(process.env.STORAGE_OVERVIEW_QUOTA_GB);
  const g = Number.isFinite(gb) && gb > 0 ? gb : 10;
  return Math.round(g * 1024 * 1024 * 1024);
};

/** Run a query; on failure log and return default row so the dashboard still loads. */
const tryQuery = async (label, sql, params = [], defaultRow = {}) => {
  try {
    const { rows } = await pool.query(sql, params);
    return rows[0] || defaultRow;
  } catch (err) {
    console.error(`[storage/overview] ${label}:`, err?.message || err);
    return defaultRow;
  }
};

/** Invoice row-size estimate using only columns present in all migrated installs (no bank_*). */
const invoicesBytesSql = `
  SELECT COALESCE(SUM(
    48::bigint
    + COALESCE(octet_length(i.id::text), 0)
    + COALESCE(octet_length(i.invoice_number::text), 0)
    + COALESCE(octet_length(i.client_id::text), 0)
    + COALESCE(octet_length(i.client_name::text), 0)
    + COALESCE(octet_length(i.client_email::text), 0)
    + COALESCE(octet_length(i.client_phone::text), 0)
    + COALESCE(octet_length(i.items::text), 0)
    + COALESCE(octet_length(i.notes::text), 0)
    + COALESCE(octet_length(i.payment_method::text), 0)
    + COALESCE(octet_length(i.status::text), 0)
  ), 0)::bigint AS b
  FROM invoices i
  WHERE i.user_id = $1
`;

const clientsBytesSql = `
  SELECT COALESCE(SUM(
    48::bigint
    + COALESCE(octet_length(c.id::text), 0)
    + COALESCE(octet_length(c.name::text), 0)
    + COALESCE(octet_length(c.email::text), 0)
    + COALESCE(octet_length(c.phone::text), 0)
    + COALESCE(octet_length(c.address::text), 0)
    + COALESCE(octet_length(c.projects::text), 0)
  ), 0)::bigint AS b
  FROM clients c
  WHERE c.user_id = $1
`;

const filesBytesSql = `
  SELECT
    COALESCE(SUM(f.file_size), 0)::bigint AS b,
    COUNT(*)::int AS n
  FROM files f
  WHERE f.user_id = $1
`;

/** Minimal log row estimate — only columns that exist on every migrated login_activity row. */
const logsBytesSqlAll = `
  SELECT
    COALESCE(SUM(
      48::bigint
      + COALESCE(octet_length(la.id::text), 0)
      + COALESCE(octet_length(la.email::text), 0)
      + COALESCE(octet_length(la.session_id::text), 0)
      + COALESCE(octet_length(la.user_agent::text), 0)
      + COALESCE(octet_length(la.ip_address::text), 0)
      + COALESCE(octet_length(la.status::text), 0)
    ), 0)::bigint AS b,
    COUNT(*)::int AS n
  FROM login_activity la
`;

const logsBytesSqlUser = `
  SELECT
    COALESCE(SUM(
      48::bigint
      + COALESCE(octet_length(la.id::text), 0)
      + COALESCE(octet_length(la.email::text), 0)
      + COALESCE(octet_length(la.session_id::text), 0)
      + COALESCE(octet_length(la.user_agent::text), 0)
      + COALESCE(octet_length(la.ip_address::text), 0)
      + COALESCE(octet_length(la.status::text), 0)
    ), 0)::bigint AS b,
    COUNT(*)::int AS n
  FROM login_activity la
  WHERE la.user_id = $1
`;

router.get('/overview', async (req, res) => {
  try {
    const sessionUserId = req.user?.id;
    if (sessionUserId == null) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    const dataUserId = req.user.dataUserId != null ? req.user.dataUserId : sessionUserId;

    const admin = isAdminRequest(req);

    const [filesR, invoicesR, clientsR, invoicesCountR, clientsCountR, logsR] = await Promise.all([
      tryQuery('files', filesBytesSql, [dataUserId], { b: '0', n: 0 }),
      tryQuery('invoices_bytes', invoicesBytesSql, [dataUserId], { b: '0' }),
      tryQuery('clients_bytes', clientsBytesSql, [dataUserId], { b: '0' }),
      tryQuery('invoices_count', 'SELECT COUNT(*)::int AS n FROM invoices WHERE user_id = $1', [dataUserId], { n: 0 }),
      tryQuery('clients_count', 'SELECT COUNT(*)::int AS n FROM clients WHERE user_id = $1', [dataUserId], { n: 0 }),
      admin
        ? tryQuery('logs_all', logsBytesSqlAll, [], { b: '0', n: 0 })
        : tryQuery('logs_user', logsBytesSqlUser, [sessionUserId], { b: '0', n: 0 }),
    ]);

    const filesBytes = Number(filesR?.b) || 0;
    const filesCount = Number(filesR?.n) || 0;
    const invoicesBytes = Number(invoicesR?.b) || 0;
    const clientsBytes = Number(clientsR?.b) || 0;
    const invoicesCount = Number(invoicesCountR?.n) || 0;
    const clientsCount = Number(clientsCountR?.n) || 0;
    const logsBytes = Number(logsR?.b) || 0;
    const logsRowCount = Number(logsR?.n) || 0;

    const totalBytes = filesBytes + invoicesBytes + clientsBytes + logsBytes;
    const qb = quotaBytes();

    res.json({
      quotaBytes: qb,
      totalBytes,
      filesBytes,
      invoicesBytes,
      clientsBytes,
      logsBytes,
      filesCount,
      invoicesCount,
      clientsCount,
      logsRowCount,
      logsScope: admin ? 'system' : 'account',
    });
  } catch (err) {
    console.error('[storage/overview]', err);
    res.status(500).json({
      error: 'Could not load storage overview',
      detail: process.env.NODE_ENV !== 'production' ? String(err?.message || err) : undefined,
    });
  }
});

export default router;
