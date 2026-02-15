import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const getSmsConfig = async (userId) => {
  const { rows } = await pool.query(
    'SELECT sms_config FROM settings WHERE user_id = $1',
    [userId]
  );
  const config = rows[0]?.sms_config;
  return config && config.userId ? config : null;
};

router.get('/settings', async (req, res) => {
  try {
    const config = await getSmsConfig(req.user.id);
    const safe = config ? { ...config, apiKey: config.apiKey ? '••••••••' : '' } : {};
    res.json(config ? safe : {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const uid = req.user.id;
    const { userId, apiKey, baseUrl, senderId } = req.body;
    const existing = await getSmsConfig(uid);
    const merged = {
      userId: (userId != null && userId !== '') ? String(userId).trim() : (existing?.userId || ''),
      apiKey: (apiKey != null && apiKey !== '' && apiKey !== '••••••••') ? String(apiKey).trim() : (existing?.apiKey || ''),
      baseUrl: (baseUrl != null && baseUrl !== '') ? String(baseUrl).trim().replace(/\/$/, '') : (existing?.baseUrl || ''),
      senderId: (senderId != null && senderId !== '') ? String(senderId).trim() : (existing?.senderId || ''),
    };
    if (!merged.userId || !merged.apiKey || !merged.baseUrl || !merged.senderId) {
      return res.status(400).json({ error: 'User ID, API Key, Base URL, and Sender ID are required' });
    }
    const config = merged;
    const { rowCount } = await pool.query(
      'UPDATE settings SET sms_config = $2, updated_at = NOW() WHERE user_id = $1',
      [uid, JSON.stringify(config)]
    );
    if (rowCount === 0) {
      await pool.query(
        'INSERT INTO settings (user_id, business_name, sms_config) VALUES ($1, $2, $3)',
        [uid, 'My Business', JSON.stringify(config)]
      );
    }
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/test', async (req, res) => {
  try {
    const config = await getSmsConfig(req.user.id);
    if (!config) {
      return res.status(400).json({ error: 'SMS gateway not configured' });
    }
    const url = `${config.baseUrl}/send-sms`;
    const params = new URLSearchParams({
      user_id: config.userId,
      api_key: config.apiKey,
      sender_id: config.senderId,
      contact: '+94771234567',
      message: 'SMS gateway test from MyAccounts',
    });
    const resp = await fetch(`${url}?${params}`, { method: 'GET' });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return res.status(400).json({
        error: data.message || data.error || `SMS API returned ${resp.status}`,
      });
    }
    res.json({ success: true, message: 'SMS gateway is configured correctly' });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || 'Failed to reach SMS gateway',
    });
  }
});

router.post('/send-bulk', async (req, res) => {
  try {
    const config = await getSmsConfig(req.user.id);
    if (!config) {
      return res.status(400).json({ error: 'SMS gateway not configured. Please set up your SMS gateway first.' });
    }
    const { contacts, message } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0 || !message) {
      return res.status(400).json({ error: 'Contacts array and message are required' });
    }
    const normalizedContacts = contacts
      .map((c) => String(c).trim())
      .filter((c) => c.length > 0)
      .map((c) => (c.startsWith('+') ? c : `+94${c.replace(/^0/, '')}`));

    if (normalizedContacts.length === 0) {
      return res.status(400).json({ error: 'No valid contacts' });
    }

    const url = `${config.baseUrl}/send-bulk-sms`;
    const formData = new URLSearchParams();
    formData.append('user_id', config.userId);
    formData.append('api_key', config.apiKey);
    formData.append('sender_id', config.senderId);
    formData.append('contacts', JSON.stringify(normalizedContacts));
    formData.append('message', String(message).slice(0, 1500));
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return res.status(400).json({
        error: data.message || data.error || `SMS API returned ${resp.status}`,
      });
    }
    res.json({ success: true, sent: normalizedContacts.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || 'Failed to send SMS',
    });
  }
});

export default router;
