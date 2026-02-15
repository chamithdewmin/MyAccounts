import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const router = express.Router();
const OTP_EXPIRY_MINUTES = 5;
const RESET_TOKEN_EXPIRY = '15m';

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const normalizePhone = (p) => {
  const digits = String(p || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('94') && digits.length >= 11) return digits;
  if (digits.startsWith('0') && digits.length >= 10) return '94' + digits.slice(1);
  if (digits.length >= 9) return '94' + digits;
  return digits;
};

/** Search all DB tables for phone: settings, clients, customers. Returns { userId, email, phone } or null */
const findAccountByPhone = async (inputNormalized) => {
  const sources = [
    { query: 'SELECT s.user_id, s.phone, u.email FROM settings s JOIN users u ON u.id = s.user_id', col: 'phone' },
    { query: 'SELECT c.user_id, c.phone, u.email FROM clients c JOIN users u ON u.id = c.user_id', col: 'phone' },
    { query: 'SELECT c.user_id, c.phone, u.email FROM customers c JOIN users u ON u.id = c.user_id', col: 'phone' },
  ];
  for (const src of sources) {
    try {
      const { rows } = await pool.query(src.query);
      for (const row of rows || []) {
        const val = row?.[src.col];
        if (val && normalizePhone(val) === inputNormalized) {
          return { userId: row.user_id, email: row.email, phone: String(val).trim() };
        }
      }
    } catch {
      /* skip table if query fails (e.g. missing column) */
    }
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

const sendOtpSms = async (phone, otp) => {
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
    const msg = `Your password change OTP is ${otp}. MyAccounts - valid for ${OTP_EXPIRY_MINUTES} minutes.`;
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

    const { rows } = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Increment token_version to invalidate all other sessions (single-session)
    await pool.query('UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = $1', [user.id]);
    const { rows: vrows } = await pool.query('SELECT token_version FROM users WHERE id = $1', [user.id]);
    const tokenVersion = vrows[0]?.token_version ?? 1;

    const token = jwt.sign(
      { id: user.id, email: user.email, v: tokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name },
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
      'SELECT id, email, name, token_version FROM users WHERE id = $1',
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
    res.json({ user: { id: rows[0].id, email: rows[0].email, name: rows[0].name } });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
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
        error: 'Your number is not in our system. Add your phone in Settings after logging in, or contact your administrator.',
      });
    }
    const phoneToSend = matched.phone;
    const em = String(matched.email || '').trim().toLowerCase();
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    try {
      await pool.query(
        'INSERT INTO password_reset_otps (email, otp, expires_at) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET otp = $2, expires_at = $3',
        [em, otp, expiresAt]
      );
    } catch (dbErr) {
      console.error('[forgot-password] OTP store:', dbErr.message);
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
    await pool.query('UPDATE users SET password_hash = $2, token_version = COALESCE(token_version, 0) + 1 WHERE LOWER(email) = $1', [email, hash]);
    res.json({ success: true, message: 'Password updated successfully. You can now sign in.' });
  } catch (err) {
    console.error('[reset-password]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
