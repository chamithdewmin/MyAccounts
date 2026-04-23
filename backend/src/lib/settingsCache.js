/**
 * In-memory settings cache with a 60-second TTL.
 * Avoids hitting the DB on every authenticated request that reads settings.
 * Call invalidateSettings(userId) whenever settings are written/updated.
 */

import pool from '../config/db.js';

const cache = new Map(); // key: userId (string), value: { data, ts }
const TTL_MS = 60_000; // 1 minute

export const getCachedSettings = async (userId) => {
  const key = String(userId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return hit.data;
  }
  const { rows } = await pool.query(
    'SELECT * FROM settings WHERE user_id = $1 LIMIT 1',
    [userId],
  );
  const data = rows[0] || null;
  cache.set(key, { data, ts: Date.now() });
  return data;
};

export const invalidateSettings = (userId) => {
  cache.delete(String(userId));
};

export const invalidateAllSettings = () => {
  cache.clear();
};
