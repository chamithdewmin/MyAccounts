import pool from '../config/db.js';

export async function getSmsConfig(userId) {
  const { rows } = await pool.query('SELECT sms_config FROM settings WHERE user_id = $1', [userId]);
  const config = rows[0]?.sms_config;
  return config && config.userId ? config : null;
}

/**
 * Send bulk SMS using the user's saved gateway. Returns { ok: true, sent: n } or throws.
 */
export async function sendBulkSms(userId, contacts, message) {
  const config = await getSmsConfig(userId);
  if (!config) {
    const err = new Error('SMS gateway not configured');
    err.code = 'NO_CONFIG';
    throw err;
  }
  const normalizedContacts = contacts
    .map((c) => String(c).trim())
    .filter((c) => c.length > 0)
    .map((c) => (c.startsWith('+') ? c : `+94${c.replace(/^0/, '')}`));

  if (normalizedContacts.length === 0) {
    const err = new Error('No valid contacts');
    err.code = 'NO_CONTACTS';
    throw err;
  }

  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/send-bulk-sms`;
  const msg = String(message).slice(0, 1500);
  const body = {
    user_id: config.userId,
    api_key: config.apiKey,
    sender_id: config.senderId,
    contacts: normalizedContacts,
    message: msg,
  };

  let resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (resp.status === 415) {
    const fd = new URLSearchParams();
    fd.append('user_id', config.userId);
    fd.append('api_key', config.apiKey);
    fd.append('sender_id', config.senderId);
    fd.append('contacts', JSON.stringify(normalizedContacts));
    fd.append('message', msg);
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: fd.toString(),
    });
  }

  const data = await resp.json().catch(() => ({}));
  const errMsg =
    data.message ||
    data.error ||
    data.msg ||
    data.status_message ||
    data.detail ||
    (typeof data === 'string' ? data : null);
  if (!resp.ok) {
    const err = new Error(errMsg || `SMS API returned ${resp.status}`);
    err.code = 'API_HTTP';
    throw err;
  }
  if (data.status === 'error' || data.success === false) {
    const err = new Error(errMsg || 'SMS gateway rejected the request');
    err.code = 'API_REJECT';
    throw err;
  }
  return { ok: true, sent: normalizedContacts.length };
}
