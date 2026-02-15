-- Add token_version for single-session (logout other browsers on new login)
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 0;

-- Add user_id to all data tables for per-user data isolation
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);

-- Migrate existing data to user 1 (admin)
UPDATE clients SET user_id = 1 WHERE user_id IS NULL;
UPDATE incomes SET user_id = 1 WHERE user_id IS NULL;
UPDATE expenses SET user_id = 1 WHERE user_id IS NULL;
UPDATE invoices SET user_id = 1 WHERE user_id IS NULL;
UPDATE settings SET user_id = 1 WHERE user_id IS NULL AND id = 1;
UPDATE assets SET user_id = 1 WHERE user_id IS NULL;
UPDATE loans SET user_id = 1 WHERE user_id IS NULL;
UPDATE cars SET user_id = 1 WHERE user_id IS NULL;
UPDATE customers SET user_id = 1 WHERE user_id IS NULL;
UPDATE orders SET user_id = 1 WHERE user_id IS NULL;

-- Allow multiple settings rows: use sequence for id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'settings_id_seq') THEN
    CREATE SEQUENCE settings_id_seq;
    SELECT setval('settings_id_seq', (SELECT COALESCE(MAX(id), 1) FROM settings));
    ALTER TABLE settings ALTER COLUMN id SET DEFAULT nextval('settings_id_seq');
  END IF;
END $$;
