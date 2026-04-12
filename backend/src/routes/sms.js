import express from 'express';
import { randomUUID } from 'crypto';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { getSmsConfig, sendBulkSms } from '../lib/smsGateway.js';

const router = express.Router();
router.use(authMiddleware);

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
      return res.status(400).json({ error: 'SMS gateway not configured. Save your User ID, API Key, Base URL, and Sender ID first.' });
    }
    // Use account-status to validate credentials without sending SMS
    const url = `${config.baseUrl.replace(/\/$/, '')}/account-status`;
    const params = new URLSearchParams({
      user_id: config.userId,
      api_key: config.apiKey,
    });
    const resp = await fetch(`${url}?${params}`, { method: 'GET' });
    const data = await resp.json().catch((e) => {
      console.error('[SMS test] Parse error:', e.message);
      return {};
    });
    const errMsg = data.message || data.error || data.msg || data.status_message || data.detail || (typeof data === 'string' ? data : null);
    if (!resp.ok) {
      console.error('[SMS test] SMS API error:', resp.status, JSON.stringify(data));
      return res.status(400).json({
        error: errMsg || `SMS API returned ${resp.status}. Check User ID, API Key, and Sender ID (use SMSlenzDEMO for testing).`,
      });
    }
    if (data.status === 'error' || data.success === false) {
      console.error('[SMS test] SMS API reject:', JSON.stringify(data));
      return res.status(400).json({
        error: errMsg || 'Invalid credentials. Verify User ID and API Key at smslenz.lk/account/api-key',
      });
    }
    res.json({ success: true, message: 'SMS gateway is configured correctly' });
  } catch (err) {
    console.error('[SMS test]', err);
    res.status(500).json({
      error: err.message || 'Failed to reach SMS gateway. Check API Base URL.',
    });
  }
});

router.post('/send-bulk', async (req, res) => {
  try {
    const { contacts, message } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0 || !message) {
      return res.status(400).json({ error: 'Contacts array and message are required' });
    }
    const result = await sendBulkSms(req.user.id, contacts, message);
    res.json({ success: true, sent: result.sent });
  } catch (err) {
    console.error('[SMS send-bulk]', err);
    if (err.code === 'NO_CONFIG') {
      return res.status(400).json({ error: 'SMS gateway not configured. Please set up your SMS gateway first.' });
    }
    if (err.code === 'NO_CONTACTS') {
      return res.status(400).json({ error: 'No valid contacts' });
    }
    res.status(400).json({
      error: err.message || 'Failed to send SMS. Check API Base URL and network.',
    });
  }
});

/** Schedule bulk SMS for a future time (processed by server worker — sends even when browser is closed). */
router.post('/schedule', async (req, res) => {
  try {
    const uid = req.user.id;
    const { message, sendAt, clientIds } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one client' });
    }
    const sendAtDate = new Date(sendAt);
    if (Number.isNaN(sendAtDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date and time' });
    }
    if (sendAtDate.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Schedule time must be in the future' });
    }

    const cfg = await getSmsConfig(uid);
    if (!cfg) {
      return res.status(400).json({ error: 'SMS gateway not configured' });
    }

    const id = `SCH-${Date.now()}-${randomUUID().slice(0, 8)}`;
    await pool.query(
      `INSERT INTO scheduled_sms (id, user_id, message, send_at, client_ids, status)
       VALUES ($1, $2, $3, $4, $5::jsonb, 'pending')`,
      [id, uid, String(message).trim().slice(0, 621), sendAtDate.toISOString(), JSON.stringify(clientIds)]
    );

    res.status(201).json({
      id,
      message: String(message).trim().slice(0, 621),
      sendAt: sendAtDate.toISOString(),
      clientIds,
      status: 'pending',
    });
  } catch (err) {
    console.error('[SMS schedule]', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/scheduled', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, message, send_at, client_ids, status, error, sent_at, created_at
       FROM scheduled_sms
       WHERE user_id = $1
       ORDER BY send_at DESC`,
      [req.user.id]
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        message: r.message,
        sendAt: r.send_at,
        clientIds: r.client_ids,
        status: r.status,
        error: r.error,
        sentAt: r.sent_at,
        createdAt: r.created_at,
      }))
    );
  } catch (err) {
    console.error('[SMS scheduled list]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/scheduled/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM scheduled_sms WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
      [req.params.id, req.user.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Not found or already processed' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[SMS scheduled delete]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
