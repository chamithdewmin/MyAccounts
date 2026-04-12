import pool from '../config/db.js';
import { sendBulkSms } from '../lib/smsGateway.js';

/**
 * Picks due pending scheduled SMS jobs and sends them. Safe for concurrent runs (claim via status update).
 */
export async function processDueScheduledSms() {
  const { rows: due } = await pool.query(
    `SELECT id, user_id, message, client_ids
     FROM scheduled_sms
     WHERE status = 'pending' AND send_at <= NOW()
     ORDER BY send_at ASC
     LIMIT 20`
  );

  for (const job of due) {
    const claim = await pool.query(
      `UPDATE scheduled_sms SET status = 'processing' WHERE id = $1 AND status = 'pending' RETURNING id`,
      [job.id]
    );
    if (claim.rowCount === 0) continue;

    try {
      let clientIds = job.client_ids;
      if (typeof clientIds === 'string') {
        try {
          clientIds = JSON.parse(clientIds);
        } catch {
          clientIds = [];
        }
      }
      if (!Array.isArray(clientIds) || clientIds.length === 0) {
        await pool.query(
          `UPDATE scheduled_sms SET status = 'failed', error = $2, sent_at = NOW() WHERE id = $1`,
          [job.id, 'No recipients']
        );
        continue;
      }

      const { rows: phonesRows } = await pool.query(
        'SELECT phone FROM clients WHERE user_id = $1 AND id = ANY($2::varchar[])',
        [job.user_id, clientIds]
      );
      const raw = phonesRows.map((r) => (r.phone || '').trim()).filter(Boolean);
      if (raw.length === 0) {
        await pool.query(
          `UPDATE scheduled_sms SET status = 'failed', error = $2, sent_at = NOW() WHERE id = $1`,
          [job.id, 'No valid phone numbers for selected clients']
        );
        continue;
      }

      await sendBulkSms(job.user_id, raw, job.message);
      await pool.query(`UPDATE scheduled_sms SET status = 'sent', sent_at = NOW(), error = NULL WHERE id = $1`, [job.id]);
      console.log(`[scheduled SMS] sent job ${job.id} (${raw.length} recipients)`);
    } catch (err) {
      console.error(`[scheduled SMS] job ${job.id}`, err);
      await pool.query(
        `UPDATE scheduled_sms SET status = 'failed', error = $2, sent_at = NOW() WHERE id = $1`,
        [job.id, (err.message || 'Send failed').slice(0, 500)]
      );
    }
  }
}
