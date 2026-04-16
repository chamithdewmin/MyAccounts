import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { computeLoginRiskScore } from '../lib/loginRiskScore.js';
import { deriveDeviceType, truncateUserAgentForStore } from '../lib/userAgent.js';
import { effectiveAppRole, resolveDataUserId } from '../lib/dataScope.js';

const getRequestIp = (req) => {
  const xf = req.headers['x-forwarded-for'];
  if (xf && typeof xf === 'string') return xf.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
};

const logAuthFailure = async (req, reason, decoded = null) => {
  try {
    const email = decoded?.email || '';
    const userId = decoded?.id || null;
    const sessionId = decoded?.sid || null;
    const rawUa = req.headers['user-agent'] || '';
    const ip = getRequestIp(req);
    const uaSt = truncateUserAgentForStore(rawUa);
    const dev = deriveDeviceType(rawUa);
    const loginAt = new Date().toISOString();
    const riskScore = await computeLoginRiskScore(pool, {
      userId,
      email,
      ipAddress: ip,
      deviceType: dev,
      loginAt,
    });
    await pool.query(
      `INSERT INTO login_activity (
        id, user_id, email, session_id, login_at, logout_at, ip_address, user_agent, device_type, risk_score, status, failure_reason, created_at
      ) VALUES ($1, $2, $3, $4, NOW(), NULL, $5, $6, $7, $8, 'unauthorized', $9, NOW())`,
      [
        `LA-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        userId,
        email,
        sessionId,
        ip,
        uaSt,
        dev,
        riskScore,
        reason,
      ],
    );
  } catch (e) {
    console.error('[auth middleware activity]', e.message);
  }
};

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    await logAuthFailure(req, 'missing_token');
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id, token_version, email, name, role, COALESCE(is_blocked, false) AS is_blocked FROM users WHERE id = $1',
      [decoded.id],
    );
    if (!rows[0]) {
      await logAuthFailure(req, 'user_not_found', decoded);
      return res.status(401).json({ error: 'User not found' });
    }
    if (rows[0].is_blocked === true || rows[0].is_blocked === 't') {
      await logAuthFailure(req, 'user_blocked', decoded);
      return res.status(403).json({ error: 'This account has been disabled. Contact an administrator.' });
    }
    const currentVersion = rows[0].token_version ?? 0;
    const tokenVersion = decoded.v ?? 0;
    if (tokenVersion !== currentVersion) {
      await logAuthFailure(req, 'session_expired', decoded);
      return res.status(401).json({ error: 'Session expired' });
    }
    const appRole = effectiveAppRole(rows[0]);
    const dataUserId = await resolveDataUserId(decoded.id, appRole);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      sid: decoded.sid || null,
      role: appRole,
      dataUserId,
    };
    next();
  } catch {
    await logAuthFailure(req, 'invalid_token');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
