import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

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
    await pool.query(
      `INSERT INTO login_activity (
        id, user_id, email, session_id, login_at, logout_at, ip_address, user_agent, status, failure_reason, created_at
      ) VALUES ($1, $2, $3, $4, NULL, NULL, $5, $6, 'failed', $7, NOW())`,
      [
        `LA-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        userId,
        email,
        sessionId,
        getRequestIp(req),
        String(req.headers['user-agent'] || '').slice(0, 1000),
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
    await logAuthFailure(req, 'unauthorized');
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query('SELECT id, token_version FROM users WHERE id = $1', [decoded.id]);
    if (!rows[0]) {
      await logAuthFailure(req, 'user_not_found', decoded);
      return res.status(401).json({ error: 'User not found' });
    }
    const currentVersion = rows[0].token_version ?? 0;
    const tokenVersion = decoded.v ?? 0;
    if (tokenVersion !== currentVersion) {
      await logAuthFailure(req, 'session_expired', decoded);
      return res.status(401).json({ error: 'Session expired' });
    }
    req.user = { id: decoded.id, email: decoded.email, sid: decoded.sid || null };
    next();
  } catch {
    await logAuthFailure(req, 'invalid_token');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
