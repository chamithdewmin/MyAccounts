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

/** Rough persisted-byte estimate for invoice rows (JSON + text columns; PDFs are usually not stored in DB). */
const invoicesBytesSql = `
  SELECT COALESCE(SUM(
    64::bigint
    + octet_length(COALESCE(i.id::text, ''))
    + octet_length(COALESCE(i.invoice_number, ''))
    + octet_length(COALESCE(i.client_id::text, ''))
    + octet_length(COALESCE(i.client_name, ''))
    + octet_length(COALESCE(i.client_email, ''))
    + octet_length(COALESCE(i.client_phone, ''))
    + COALESCE(octet_length(i.items::text), 0)
    + octet_length(COALESCE(i.notes, ''))
    + COALESCE(octet_length(i.bank_details::text), 0)
    + COALESCE(octet_length(i.bank_details_encrypted::text), 0)
  ), 0)::bigint AS b
  FROM invoices i
  WHERE i.user_id = $1
`;

const clientsBytesSql = `
  SELECT COALESCE(SUM(
    48::bigint
    + octet_length(COALESCE(c.id::text, ''))
    + octet_length(COALESCE(c.name, ''))
    + octet_length(COALESCE(c.email, ''))
    + octet_length(COALESCE(c.phone, ''))
    + octet_length(COALESCE(c.address, ''))
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

const logsBytesSqlAll = `
  SELECT
    COALESCE(SUM(
      72::bigint
      + octet_length(COALESCE(la.id, ''))
      + octet_length(COALESCE(la.email, ''))
      + octet_length(COALESCE(la.user_name, ''))
      + octet_length(COALESCE(la.session_id::text, ''))
      + COALESCE(octet_length(la.user_agent), 0)
      + octet_length(COALESCE(la.device_type::text, ''))
      + octet_length(COALESCE(la.failure_reason::text, ''))
      + octet_length(COALESCE(la.ip_address::text, ''))
      + octet_length(COALESCE(la.role::text, ''))
      + octet_length(COALESCE(la.status::text, ''))
    ), 0)::bigint AS b,
    COUNT(*)::int AS n
  FROM login_activity la
`;

const logsBytesSqlUser = `
  SELECT
    COALESCE(SUM(
      72::bigint
      + octet_length(COALESCE(la.id, ''))
      + octet_length(COALESCE(la.email, ''))
      + octet_length(COALESCE(la.user_name, ''))
      + octet_length(COALESCE(la.session_id::text, ''))
      + COALESCE(octet_length(la.user_agent), 0)
      + octet_length(COALESCE(la.device_type::text, ''))
      + octet_length(COALESCE(la.failure_reason::text, ''))
      + octet_length(COALESCE(la.ip_address::text, ''))
      + octet_length(COALESCE(la.role::text, ''))
      + octet_length(COALESCE(la.status::text, ''))
    ), 0)::bigint AS b,
    COUNT(*)::int AS n
  FROM login_activity la
  WHERE la.user_id = $1
`;

router.get('/overview', async (req, res) => {
  try {
    const dataUserId = req.user.dataUserId;
    const sessionUserId = req.user.id;
    const admin = isAdminRequest(req);

    const [
      filesR,
      invoicesR,
      clientsR,
      invoicesCountR,
      clientsCountR,
      logsR,
    ] = await Promise.all([
      pool.query(filesBytesSql, [dataUserId]),
      pool.query(invoicesBytesSql, [dataUserId]),
      pool.query(clientsBytesSql, [dataUserId]),
      pool.query('SELECT COUNT(*)::int AS n FROM invoices WHERE user_id = $1', [dataUserId]),
      pool.query('SELECT COUNT(*)::int AS n FROM clients WHERE user_id = $1', [dataUserId]),
      admin ? pool.query(logsBytesSqlAll) : pool.query(logsBytesSqlUser, [sessionUserId]),
    ]);

    const filesBytes = Number(filesR.rows[0]?.b) || 0;
    const filesCount = Number(filesR.rows[0]?.n) || 0;
    const invoicesBytes = Number(invoicesR.rows[0]?.b) || 0;
    const clientsBytes = Number(clientsR.rows[0]?.b) || 0;
    const invoicesCount = Number(invoicesCountR.rows[0]?.n) || 0;
    const clientsCount = Number(clientsCountR.rows[0]?.n) || 0;
    const logsBytes = Number(logsR.rows[0]?.b) || 0;
    const logsRowCount = Number(logsR.rows[0]?.n) || 0;

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
    res.status(500).json({ error: 'Could not load storage overview' });
  }
});

export default router;
