import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { effectiveAppRole, isAdminRequest } from '../lib/dataScope.js';

const router = express.Router();
const OTP_EXPIRY_MINUTES = 5;
const RESET_TOKEN_EXPIRY = '15m';
const ADMIN_EMAIL = 'logozodev@gmail.com';

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const normalizePhone = (p) => {
  const digits = String(p || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('94') && digits.length >= 11) return digits;
  if (digits.startsWith('0') && digits.length >= 10) return '94' + digits.slice(1);
  if (digits.length >= 9) return '94' + digits;
  return digits;
};

const getRequestIp = (req) => {
  const xf = req.headers['x-forwarded-for'];
  if (xf && typeof xf === 'string') {
    return xf.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '';
};

const insertLoginActivity = async ({
  userId = null,
  email = '',
  userName = '',
  sessionId = null,
  loginAt = null,
  logoutAt = null,
  ipAddress = '',
  userAgent = '',
  success = false,
  role = null,
  failureReason = null,
}) => {
  const status = success ? 'active' : 'failed';
  const effectiveLoginAt = loginAt || new Date().toISOString();
  const sharedValues = [
    userId,
    email,
    userName,
    sessionId,
    effectiveLoginAt,
    logoutAt,
    ipAddress,
    userAgent,
    success,
    role,
    status,
    failureReason,
  ];
  try {
    // Preferred path for latest schema where id is varchar.
    const { rows } = await pool.query(
      `INSERT INTO login_activity (
        id, user_id, email, user_name, session_id, login_at, logout_at, ip_address, user_agent, success, role, status, failure_reason, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING id::text AS id`,
      [`LA-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`, ...sharedValues],
    );
    return rows[0]?.id || null;
  } catch (firstErr) {
    try {
      // Backward compatibility: legacy schema where id is SERIAL/INT.
      const { rows } = await pool.query(
        `INSERT INTO login_activity (
          user_id, email, user_name, session_id, login_at, logout_at, ip_address, user_agent, success, role, status, failure_reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        RETURNING id::text AS id`,
        sharedValues,
      );
      return rows[0]?.id || null;
    } catch (e) {
      console.error('[auth activity log]', firstErr.message, '| fallback:', e.message);
      return null;
    }
  }
};

/** Search settings only (GET /api/settings phone). Returns { userId, email, phone } or null */
const findAccountByPhone = async (inputNormalized) => {
  try {
    const { rows } = await pool.query(
      'SELECT s.user_id, s.phone, u.email FROM settings s JOIN users u ON u.id = s.user_id WHERE s.phone IS NOT NULL AND TRIM(COALESCE(s.phone, \'\')) != \'\''
    );
    for (const row of rows || []) {
      const val = row?.phone;
      if (val && normalizePhone(val) === inputNormalized) {
        return { userId: row.user_id, email: row.email, phone: String(val).trim() };
      }
    }
  } catch {
    /* query failed */
  }
  return null;
};

const getSmsConfigForUser = async (userId) => {
  try {
    const { rows } = await pool.query('SELECT sms_config FROM settings WHERE user_id = $1', [userId]);
    const c = rows[0]?.sms_config;
    return c && c.userId ? c : null;
  } catch {
    return null;
  }
};

const sendOtpSms = async (phone, otp, purpose = 'password change') => {
  try {
    const { rows } = await pool.query(
      "SELECT id FROM users WHERE email = 'logozodev@gmail.com'"
    );
    const adminId = rows?.[0]?.id;
    if (!adminId) return { sent: false, error: 'Admin SMS config not found' };
    const config = await getSmsConfigForUser(adminId);
    if (!config) return { sent: false, error: 'SMS gateway not configured. Please contact your administrator.' };
    const p = String(phone).trim();
    const normalized = p.startsWith('+') ? p : `+94${p.replace(/^0/, '')}`;
    const msg = purpose === 'reset_data'
      ? `Your reset data OTP is ${otp}. MyAccounts - valid for ${OTP_EXPIRY_MINUTES} min.`
      : `Your password change OTP is ${otp}. MyAccounts - valid for ${OTP_EXPIRY_MINUTES} minutes.`;
    const url = `${config.baseUrl.replace(/\/$/, '')}/send-sms`;
    const params = new URLSearchParams({
      user_id: config.userId,
      api_key: config.apiKey,
      sender_id: config.senderId,
      contact: normalized,
      message: msg,
    });
    const resp = await fetch(`${url}?${params}`, { method: 'GET' });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { sent: false, error: data.message || data.error || `SMS failed: ${resp.status}` };
    }
    if (data.status === 'error' || data.success === false) {
      return { sent: false, error: data.message || data.error || 'SMS failed' };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e.message || 'Failed to send SMS' };
  }
};

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const emailTrimmed = String(email).trim().toLowerCase();
    if (!emailTrimmed) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { rows } = await pool.query(
      'SELECT id, email, name, password_hash, role FROM users WHERE LOWER(TRIM(email)) = $1',
      [emailTrimmed]
    );

    const user = rows[0];
    const ipAddress = getRequestIp(req);
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 1000);
    if (!user) {
      await insertLoginActivity({
        email: emailTrimmed,
        loginAt: new Date().toISOString(),
        ipAddress,
        userAgent,
        success: false,
        failureReason: 'unauthorized',
      });
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await insertLoginActivity({
        userId: user.id,
        email: user.email,
        userName: user.name || '',
        loginAt: new Date().toISOString(),
        ipAddress,
        userAgent,
        success: false,
        failureReason: 'invalid_password',
        role: effectiveAppRole(user) === 'admin' ? 'admin' : 'staff',
      });
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const { rows: vrows } = await pool.query('SELECT token_version FROM users WHERE id = $1', [user.id]);
    const tokenVersion = vrows[0]?.token_version ?? 0;
    const sessionId = randomUUID();
    const loginAt = new Date().toISOString();

    const token = jwt.sign(
      { id: user.id, email: user.email, v: tokenVersion, sid: sessionId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const loginActivityId = await insertLoginActivity({
      userId: user.id,
      email: user.email,
      userName: user.name || '',
      sessionId,
      loginAt,
      ipAddress,
      userAgent,
      success: true,
      role: effectiveAppRole(user) === 'admin' ? 'admin' : 'staff',
    });

    res.json({
      success: true,
      token,
      loginActivityId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: effectiveAppRole(user),
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id, email, name, token_version, role FROM users WHERE id = $1',
      [decoded.id]
    );
    if (!rows[0]) {
      return res.status(401).json({ error: 'User not found' });
    }
    const currentVersion = rows[0].token_version ?? 0;
    const tokenVersion = decoded.v ?? 0;
    if (tokenVersion !== currentVersion) {
      return res.status(401).json({ error: 'Session expired' });
    }
    if (decoded.sid) {
      const ipAddress = getRequestIp(req);
      const userAgent = String(req.headers['user-agent'] || '').slice(0, 1000);
      const { rows: ar } = await pool.query(
        `SELECT id FROM login_activity
         WHERE session_id = $1 AND user_id = $2 AND status = $3
           AND COALESCE(ip_address, '') = COALESCE($4, '')
           AND COALESCE(user_agent, '') = COALESCE($5, '')
         LIMIT 1`,
        [decoded.sid, decoded.id, 'active', ipAddress, userAgent],
      );
      if (!ar[0]) {
        await insertLoginActivity({
          userId: decoded.id,
          email: rows[0].email,
          userName: rows[0].name || '',
          sessionId: decoded.sid,
          loginAt: new Date().toISOString(),
          ipAddress,
          userAgent,
          success: true,
          role: effectiveAppRole(rows[0]) === 'admin' ? 'admin' : 'staff',
        });
      }
    }
    res.json({
      user: {
        id: rows[0].id,
        email: rows[0].email,
        name: rows[0].name,
        role: effectiveAppRole(rows[0]),
      },
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const raw = req.body?.activityId ?? req.body?.loginActivityId;
    const activityId = raw != null ? String(raw).trim() : null;
    const sid = req.user.sid;
    if (activityId) {
      await pool.query(
        `UPDATE login_activity
         SET logout_at = NOW(), status = 'completed'
         WHERE id::text = $1 AND user_id = $2 AND COALESCE(success, true) = true AND logout_at IS NULL`,
        [activityId, req.user.id],
      );
    } else if (sid) {
      await pool.query(
        `UPDATE login_activity
         SET logout_at = NOW(), status = 'completed'
         WHERE session_id = $1 AND user_id = $2 AND status = 'active'`,
        [sid, req.user.id],
      );
    } else {
      // Backward compatibility: older tokens may not have sid.
      await pool.query(
        `UPDATE login_activity
         SET logout_at = NOW(), status = 'completed'
         WHERE user_id = $1 AND status = 'active'`,
        [req.user.id],
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[logout]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/login-activity/stats', authMiddleware, async (req, res) => {
  try {
    if (!isAdminRequest(req)) return res.status(403).json({ error: 'Forbidden' });
    const [totalUsersR, activeSessionsR, activeUsersR, totalSessionsR, failedR] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS c FROM users'),
      pool.query("SELECT COUNT(*)::int AS c FROM login_activity WHERE COALESCE(success, true) = true AND logout_at IS NULL"),
      pool.query(`SELECT COUNT(DISTINCT user_id)::int AS c FROM login_activity
                  WHERE COALESCE(success, true) = true AND logout_at IS NULL AND user_id IS NOT NULL`),
      pool.query("SELECT COUNT(*)::int AS c FROM login_activity WHERE COALESCE(success, true) = true"),
      pool.query("SELECT COUNT(*)::int AS c FROM login_activity WHERE COALESCE(success, false) = false"),
    ]);
    res.json({
      totalUsers: totalUsersR.rows[0]?.c ?? 0,
      activeSessions: activeSessionsR.rows[0]?.c ?? 0,
      activeUsers: activeUsersR.rows[0]?.c ?? 0,
      totalSessions: totalSessionsR.rows[0]?.c ?? 0,
      failedAttempts: failedR.rows[0]?.c ?? 0,
    });
  } catch (err) {
    console.error('login-activity/stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/login-activity', authMiddleware, async (req, res) => {
  try {
    if (!isAdminRequest(req)) return res.status(403).json({ error: 'Forbidden' });
    const { rows } = await pool.query(
      `SELECT id, user_id AS "userId", email, user_name AS "userName", COALESCE(success, status != 'failed') AS success,
              role, ip_address AS "ipAddress", failure_reason AS "failureReason",
              COALESCE(login_at, created_at) AS "loginAt", logout_at AS "logoutAt", status, created_at AS "createdAt"
       FROM login_activity
       ORDER BY COALESCE(login_at, created_at) DESC, created_at DESC
       LIMIT 500`,
    );
    res.json(rows);
  } catch (err) {
    console.error('login-activity:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/activity', authMiddleware, async (req, res) => {
  try {
    const adminUser = isAdminRequest(req);
    const filterUserIdRaw = req.query.userId;
    const filterUserId = filterUserIdRaw ? Number(filterUserIdRaw) : null;

    if (filterUserIdRaw && (!Number.isInteger(filterUserId) || filterUserId <= 0)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    let rows;
    if (adminUser) {
      if (filterUserId) {
        ({ rows } = await pool.query(
          `SELECT id, user_id, email, user_name, role, session_id, login_at, logout_at, ip_address, status, failure_reason, created_at
           FROM login_activity
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 500`,
          [filterUserId],
        ));
      } else {
        ({ rows } = await pool.query(
          `SELECT id, user_id, email, user_name, role, session_id, login_at, logout_at, ip_address, status, failure_reason, created_at
           FROM login_activity
           ORDER BY created_at DESC
           LIMIT 500`,
        ));
      }
    } else {
      ({ rows } = await pool.query(
        `SELECT id, user_id, email, user_name, role, session_id, login_at, logout_at, ip_address, status, failure_reason, created_at
         FROM login_activity
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 500`,
        [req.user.id],
      ));
    }

    const usersRes = adminUser
      ? await pool.query('SELECT id, name, email, role FROM users ORDER BY name ASC')
      : await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
    const users = usersRes.rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }));

    res.json({
      items: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        email: r.email,
        userName: r.user_name,
        role: r.role,
        sessionId: r.session_id,
        loginAt: r.login_at,
        logoutAt: r.logout_at,
        ipAddress: r.ip_address,
        status: r.status,
        failureReason: r.failure_reason,
        createdAt: r.created_at,
      })),
      users,
    });
  } catch (err) {
    console.error('[auth activity]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    const inputNormalized = normalizePhone(phone);
    if (!inputNormalized || inputNormalized.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid phone number.' });
    }
    let matched;
    try {
      matched = await findAccountByPhone(inputNormalized);
    } catch (dbErr) {
      console.error('[forgot-password] findAccountByPhone:', dbErr.message);
      return res.status(500).json({
        error: 'Service unavailable. Please contact your administrator.',
      });
    }
    if (!matched) {
      return res.status(400).json({
        error:
          'Your number is not in our system. Add your phone in Settings after logging in, or contact your administrator.',
      });
    }
    const phoneToSend = matched.phone;
    const em = String(matched.email || '').trim().toLowerCase();
    if (!em) {
      return res.status(400).json({ error: 'Could not determine account. Please contact your administrator.' });
    }
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_otps (
          email VARCHAR(255) PRIMARY KEY,
          otp VARCHAR(10) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await pool.query(
        'INSERT INTO password_reset_otps (email, otp, expires_at) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET otp = $2, expires_at = $3',
        [em, otp, expiresAt]
      );
    } catch (dbErr) {
      console.error('[forgot-password] OTP store:', dbErr.message, dbErr.code);
      return res.status(500).json({
        error: 'Service unavailable. Please try again later or contact your administrator.',
      });
    }
    const result = await sendOtpSms(phoneToSend, otp);
    if (!result.sent) {
      const isGatewayNotConfigured = /not configured|gateway not configured/i.test(String(result.error || ''));
      if (isGatewayNotConfigured && process.env.NODE_ENV !== 'production') {
        return res.json({
          success: true,
          message: 'SMS gateway not configured. Use the OTP below for testing.',
          devOtp: otp,
        });
      }
      return res.status(400).json({ error: result.error || 'Could not send OTP via SMS.' });
    }
    res.json({ success: true, message: 'OTP sent to your registered phone number.' });
  } catch (err) {
    console.error('[forgot-password]', err);
    const isDbError = err.code === '42P01' || err.code === '42703' || err.message?.includes('relation') || err.message?.includes('column');
    res.status(500).json({
      error: isDbError
        ? 'Service unavailable. Please ensure the database migration has been run.'
        : 'Something went wrong. Please try again or contact your administrator.',
    });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }
    const inputNormalized = normalizePhone(phone);
    if (!inputNormalized || inputNormalized.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid phone number.' });
    }
    let matched;
    try {
      matched = await findAccountByPhone(inputNormalized);
    } catch (dbErr) {
      console.error('[verify-otp] findAccountByPhone:', dbErr.message);
      return res.status(500).json({ error: 'Service unavailable. Please contact your administrator.' });
    }
    if (!matched) {
      return res.status(400).json({ error: 'Your number is not in our system.' });
    }
    const em = String(matched.email || '').trim().toLowerCase();
    const otpStr = String(otp).trim().replace(/\s/g, '');
    const { rows } = await pool.query(
      'SELECT otp, expires_at FROM password_reset_otps WHERE email = $1',
      [em]
    );
    if (!rows[0]) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Request a new one.' });
    }
    if (new Date() > new Date(rows[0].expires_at)) {
      await pool.query('DELETE FROM password_reset_otps WHERE email = $1', [em]);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }
    if (rows[0].otp !== otpStr) {
      return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' });
    }
    const resetToken = jwt.sign(
      { email: em, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: RESET_TOKEN_EXPIRY }
    );
    await pool.query('DELETE FROM password_reset_otps WHERE email = $1', [em]);
    res.json({ success: true, resetToken });
  } catch (err) {
    console.error('[verify-otp]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/send-reset-data-otp', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const { rows } = await pool.query('SELECT phone FROM settings WHERE user_id = $1', [uid]);
    const phone = rows[0]?.phone?.trim();
    if (!phone) {
      return res.status(400).json({ error: 'Add your phone number in Settings first to receive the OTP.' });
    }
    const inputNormalized = normalizePhone(phone);
    if (!inputNormalized || inputNormalized.length < 10) {
      return res.status(400).json({ error: 'Invalid phone number in Settings. Please update it.' });
    }
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reset_data_otps (
        user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        otp VARCHAR(10) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    await pool.query(
      'INSERT INTO reset_data_otps (user_id, otp, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET otp = $2, expires_at = $3',
      [uid, otp, expiresAt]
    );
    const result = await sendOtpSms(phone, otp, 'reset_data');
    if (!result.sent) {
      if (process.env.NODE_ENV !== 'production' && /not configured|gateway not configured/i.test(String(result.error || ''))) {
        return res.json({ success: true, message: 'OTP sent.', devOtp: otp });
      }
      return res.status(400).json({ error: result.error || 'Could not send OTP.' });
    }
    res.json({ success: true, message: 'OTP sent to your registered phone number.' });
  } catch (err) {
    console.error('[send-reset-data-otp]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/confirm-reset-data', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const { otp } = req.body;
    const otpStr = String(otp || '').trim().replace(/\s/g, '');
    if (!otpStr) {
      return res.status(400).json({ error: 'OTP is required.' });
    }
    const { rows } = await pool.query('SELECT otp, expires_at FROM reset_data_otps WHERE user_id = $1', [uid]);
    if (!rows[0]) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Request a new one.' });
    }
    if (new Date() > new Date(rows[0].expires_at)) {
      await pool.query('DELETE FROM reset_data_otps WHERE user_id = $1', [uid]);
      return res.status(400).json({ error: 'OTP has expired. Request a new one.' });
    }
    if (rows[0].otp !== otpStr) {
      return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' });
    }
    await pool.query('DELETE FROM reset_data_otps WHERE user_id = $1', [uid]);
    const tables = ['orders', 'incomes', 'invoices', 'clients', 'customers', 'expenses', 'cars', 'assets', 'loans', 'transfers', 'reminders'];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const table of tables) {
        try {
          await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [uid]);
        } catch (tErr) {
          if (tErr.code !== '42P01' && tErr.code !== '42703') throw tErr;
        }
      }
      try {
        await client.query('DELETE FROM bank_details WHERE user_id = $1', [uid]);
      } catch {
        /* ignore */
      }
      await client.query(
        `UPDATE settings SET business_name = 'My Business', logo = NULL, invoice_theme_color = '#F97316', opening_cash = 0, owner_capital = 0, payables = 0, tax_rate = 10, tax_enabled = true, currency = 'LKR', theme = 'dark', updated_at = NOW() WHERE user_id = $1`,
        [uid]
      );
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
    res.json({ success: true, message: 'All your data has been reset.' });
  } catch (err) {
    console.error('[confirm-reset-data]', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }
    const pwd = String(newPassword).trim();
    if (pwd.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new OTP.' });
    }
    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid reset token.' });
    }
    const email = decoded.email;
    const hash = await bcrypt.hash(pwd, 10);
    const { rowCount } = await pool.query(
      'UPDATE users SET password_hash = $2, token_version = COALESCE(token_version, 0) + 1 WHERE LOWER(TRIM(email)) = $1',
      [email.toLowerCase().trim(), hash]
    );
    if (rowCount === 0) {
      return res.status(400).json({ error: 'Account not found. Please request a new OTP.' });
    }
    res.json({ success: true, message: 'Password updated successfully. You can now sign in.' });
  } catch (err) {
    console.error('[reset-password]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
