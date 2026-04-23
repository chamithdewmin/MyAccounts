import pool from '../config/db.js';

export const findAllByUser = (userId) =>
  pool.query(
    'SELECT * FROM calendar_events WHERE user_id = $1 ORDER BY date ASC, time ASC',
    [userId],
  );

export const findByIdAndUser = (id, userId) =>
  pool.query('SELECT * FROM calendar_events WHERE id = $1 AND user_id = $2', [id, userId]);

export const insert = (id, userId, eventName, date, time, notes) =>
  pool.query(
    'INSERT INTO calendar_events (id, user_id, event_name, date, time, notes) VALUES ($1,$2,$3,$4,$5,$6)',
    [id, userId, eventName, date, time, notes],
  );

export const update = (id, userId, { eventName, date, time, notes }) =>
  pool.query(
    `UPDATE calendar_events SET event_name=COALESCE($3,event_name), date=COALESCE($4,date),
     time=COALESCE($5,time), notes=COALESCE($6,notes)
     WHERE id=$1 AND user_id=$2 RETURNING *`,
    [id, userId, eventName, date, time, notes],
  );

export const remove = (id, userId) =>
  pool.query('DELETE FROM calendar_events WHERE id = $1 AND user_id = $2', [id, userId]);
