import pool from '../config/db.js';

export const ADMIN_EMAIL = 'logozodev@gmail.com';

/** App role: admin | staff — uses DB role, with legacy fallback on admin email */
export function effectiveAppRole(userRow) {
  if (!userRow) return 'staff';
  const raw = userRow.role != null && String(userRow.role).trim() !== ''
    ? String(userRow.role).toLowerCase().trim()
    : null;
  if (raw === 'admin' || raw === 'staff') return raw;
  return String(userRow.email || '').toLowerCase().trim() === ADMIN_EMAIL ? 'admin' : 'staff';
}

/** Shared dataset: lowest-id user per role owns the bucket everyone of that role uses */
export async function resolveDataUserId(userId, appRole) {
  const bucketRole = appRole === 'admin' ? 'admin' : 'staff';
  const { rows } = await pool.query(
    `SELECT id FROM users WHERE role = $1 ORDER BY id ASC LIMIT 1`,
    [bucketRole],
  );
  if (rows[0]?.id != null) return rows[0].id;
  return userId;
}

/** Admin routes (Users, backup, login-activity): role from DB or legacy admin email */
export function isAdminRequest(req) {
  return (
    String(req.user?.role || '').toLowerCase() === 'admin' ||
    String(req.user?.email || '').toLowerCase().trim() === ADMIN_EMAIL
  );
}
