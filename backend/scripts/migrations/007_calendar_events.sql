-- Calendar events (PostgreSQL) — matches backend/src/index.js bootstrap
-- Run manually if you need to create or inspect the table outside the app.

CREATE TABLE IF NOT EXISTS calendar_events (
  id VARCHAR(80) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_name VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date
  ON calendar_events (user_id, event_date, event_time);

-- Example: insert (prefer using the API so id format and auth stay consistent)
-- INSERT INTO calendar_events (id, user_id, event_name, event_date, event_time, notes)
-- VALUES ('EV-EXAMPLE1', 1, 'Team meeting', '2026-04-20', '14:30:00', 'Room A');

-- Example: update one row for a user (replace ids)
-- UPDATE calendar_events
-- SET event_name = 'Updated title',
--     event_date = '2026-04-21',
--     event_time = '09:00:00',
--     notes = 'Updated notes'
-- WHERE id = 'EV-XXXX' AND user_id = 1;

-- Example: delete one row for a user
-- DELETE FROM calendar_events WHERE id = 'EV-XXXX' AND user_id = 1;
