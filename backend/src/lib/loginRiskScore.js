/**
 * Heuristic login risk (0–100). Tune weights as needed.
 * - New IP vs recent successful logins: +30
 * - Device class change vs last success: +20
 * - More than 3 failures in 15 minutes (same user or email): +25
 * - Night window UTC 01:00–05:59: +10
 * (Geo / country can be added later, e.g. CF-IPCountry + stored last country.)
 */

export function riskLevelFromScore(score) {
  const s = Number(score) || 0;
  if (s >= 71) return 'high';
  if (s >= 31) return 'suspicious';
  return 'safe';
}

export async function computeLoginRiskScore(pool, { userId, email, ipAddress, deviceType, loginAt }) {
  let risk = 0;
  const ip = String(ipAddress || '').trim();
  const dev = String(deviceType || 'unknown').toLowerCase();
  const emailNorm = email ? String(email).trim().toLowerCase() : '';
  const uid =
    userId != null && userId !== '' && Number.isFinite(Number(userId)) && Number(userId) > 0
      ? Number(userId)
      : null;
  const loginTs = loginAt ? new Date(loginAt) : new Date();
  if (Number.isNaN(loginTs.getTime())) return 0;

  try {
    let priorIps = [];
    if (uid != null) {
      const { rows } = await pool.query(
        `SELECT ip_address FROM login_activity
         WHERE user_id = $1 AND COALESCE(success, true) = true
           AND COALESCE(NULLIF(TRIM(ip_address), ''), '') <> ''
         ORDER BY COALESCE(login_at, created_at) DESC
         LIMIT 15`,
        [uid],
      );
      priorIps = rows.map((r) => String(r.ip_address || '').trim()).filter(Boolean);
    } else if (emailNorm) {
      const { rows } = await pool.query(
        `SELECT ip_address FROM login_activity
         WHERE LOWER(TRIM(COALESCE(email, ''))) = $1 AND COALESCE(success, true) = true
           AND COALESCE(NULLIF(TRIM(ip_address), ''), '') <> ''
         ORDER BY COALESCE(login_at, created_at) DESC
         LIMIT 15`,
        [emailNorm],
      );
      priorIps = rows.map((r) => String(r.ip_address || '').trim()).filter(Boolean);
    }
    if (ip && priorIps.length > 0 && !priorIps.includes(ip)) risk += 30;
  } catch {
    /* ignore */
  }

  try {
    let lastDevice = null;
    if (uid != null) {
      const { rows } = await pool.query(
        `SELECT LOWER(TRIM(COALESCE(device_type, ''))) AS d FROM login_activity
         WHERE user_id = $1 AND COALESCE(success, true) = true
         ORDER BY COALESCE(login_at, created_at) DESC
         LIMIT 1`,
        [uid],
      );
      lastDevice = rows[0]?.d || null;
    } else if (emailNorm) {
      const { rows } = await pool.query(
        `SELECT LOWER(TRIM(COALESCE(device_type, ''))) AS d FROM login_activity
         WHERE LOWER(TRIM(COALESCE(email, ''))) = $1 AND COALESCE(success, true) = true
         ORDER BY COALESCE(login_at, created_at) DESC
         LIMIT 1`,
        [emailNorm],
      );
      lastDevice = rows[0]?.d || null;
    }
    if (lastDevice && dev !== 'unknown' && lastDevice !== '' && lastDevice !== 'unknown' && lastDevice !== dev) {
      risk += 20;
    }
  } catch {
    /* ignore */
  }

  try {
    let failCount = 0;
    if (uid != null) {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS c FROM login_activity
         WHERE user_id = $1 AND COALESCE(success, false) = false
           AND COALESCE(login_at, created_at) >= NOW() - INTERVAL '15 minutes'`,
        [uid],
      );
      failCount = rows[0]?.c ?? 0;
    } else if (emailNorm) {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS c FROM login_activity
         WHERE LOWER(TRIM(COALESCE(email, ''))) = $1 AND COALESCE(success, false) = false
           AND COALESCE(login_at, created_at) >= NOW() - INTERVAL '15 minutes'`,
        [emailNorm],
      );
      failCount = rows[0]?.c ?? 0;
    }
    if (failCount > 3) risk += 25;
  } catch {
    /* ignore */
  }

  const h = loginTs.getUTCHours();
  if (h >= 1 && h <= 5) risk += 10;

  return Math.min(100, Math.max(0, risk));
}
