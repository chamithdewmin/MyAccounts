import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import clientsRoutes from './routes/clients.js';
import incomesRoutes from './routes/incomes.js';
import expensesRoutes from './routes/expenses.js';
import invoicesRoutes from './routes/invoices.js';
import settingsRoutes from './routes/settings.js';
import assetsRoutes from './routes/assets.js';
import loansRoutes from './routes/loans.js';
import carsRoutes from './routes/cars.js';
import customersRoutes from './routes/customers.js';
import ordersRoutes from './routes/orders.js';
import usersRoutes from './routes/users.js';
import smsRoutes from './routes/sms.js';
import transfersRoutes from './routes/transfers.js';
import remindersRoutes from './routes/reminders.js';
import bankDetailsRoutes from './routes/bankDetails.js';
import aiRoutes from './routes/ai.js';
import backupRoutes from './routes/backup.js';
import estimatesRoutes from './routes/estimates.js';
import calendarEventsRoutes from './routes/calendarEvents.js';
import projectsRoutes from './routes/projects.js';
import projectTasksRoutes from './routes/projectTasks.js';
import filesRoutes from './routes/files.js';
import pool from './config/db.js';
import { processDueScheduledSms } from './workers/scheduledSmsWorker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDb(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (i === maxAttempts - 1) throw err;
      console.log(`Waiting for database... (${i + 1}/${maxAttempts})`);
      await sleep(2000);
    }
  }
}

async function initDb() {
  await waitForDb();
  const sqlPath = path.join(__dirname, '..', 'scripts', 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('Database tables ready.');

  // Add user_id for per-user data isolation
  try {
    const migratePath = path.join(__dirname, '..', 'scripts', 'migrate-user-id.sql');
    const migrate = fs.readFileSync(migratePath, 'utf8');
    await pool.query(migrate);
    console.log('Per-user data isolation enabled.');
  } catch (migErr) {
    console.warn('Migration warning (app will continue):', migErr.message);
  }

  // Ensure auth structures exist (in case migration failed partway)
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 0');
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'staff'`);
    await pool.query(`UPDATE users SET role = 'staff' WHERE role IS NULL`);
    await pool.query(`UPDATE users SET role = 'admin' WHERE LOWER(TRIM(email)) = 'logozodev@gmail.com'`);
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false');
    await pool.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id INT');
    await pool.query("ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT ''");
    await pool.query('UPDATE settings SET user_id = 1 WHERE user_id IS NULL');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        email VARCHAR(255) PRIMARY KEY,
        otp VARCHAR(10) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transfers (
        id VARCHAR(50) PRIMARY KEY,
        user_id INT REFERENCES users(id),
        from_account VARCHAR(20) NOT NULL,
        to_account VARCHAR(20) NOT NULL,
        amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        date DATE NOT NULL,
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id VARCHAR(50) PRIMARY KEY,
        user_id INT REFERENCES users(id),
        type VARCHAR(20) NOT NULL DEFAULT '',
        reference_id VARCHAR(100) NOT NULL DEFAULT '',
        reminder_date DATE NOT NULL,
        sms_contact VARCHAR(50) NOT NULL,
        message TEXT DEFAULT '',
        status VARCHAR(20) DEFAULT 'pending',
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_activity (
        id VARCHAR(80) PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        email VARCHAR(255) DEFAULT '',
        user_name VARCHAR(255) DEFAULT '',
        session_id VARCHAR(80),
        login_at TIMESTAMPTZ,
        logout_at TIMESTAMPTZ,
        ip_address VARCHAR(100) DEFAULT '',
        user_agent TEXT DEFAULT '',
        device_type VARCHAR(20) NOT NULL DEFAULT 'unknown',
        risk_score SMALLINT NOT NULL DEFAULT 0,
        success BOOLEAN,
        role VARCHAR(50),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        failure_reason VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query("ALTER TABLE login_activity ADD COLUMN IF NOT EXISTS user_name VARCHAR(255) DEFAULT ''");
    await pool.query('ALTER TABLE login_activity ADD COLUMN IF NOT EXISTS success BOOLEAN');
    await pool.query('ALTER TABLE login_activity ADD COLUMN IF NOT EXISTS role VARCHAR(50)');
    await pool.query(
      "ALTER TABLE login_activity ADD COLUMN IF NOT EXISTS device_type VARCHAR(20) NOT NULL DEFAULT 'unknown'",
    );
    await pool.query(
      'ALTER TABLE login_activity ADD COLUMN IF NOT EXISTS risk_score SMALLINT NOT NULL DEFAULT 0',
    );
    await pool.query('UPDATE login_activity SET created_at = NOW() WHERE created_at IS NULL');
    await pool.query('UPDATE login_activity SET login_at = COALESCE(login_at, created_at, NOW()) WHERE login_at IS NULL');
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_login_activity_user_created ON login_activity (user_id, created_at DESC)`
    );
    console.log('Forgot-password and user-delete tables ready.');
  } catch (e) {
    console.warn('Forgot-password setup:', e.message);
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bank_details (
        user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        data_encrypted TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Bank details table ready.');
  } catch (e) {
    console.warn('Bank details table:', e.message);
  }
  try {
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id)');
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bank_details JSONB');
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bank_details_encrypted TEXT');
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS show_signature_area BOOLEAN DEFAULT false');
    await pool.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_details_encrypted TEXT');
    await pool.query("ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_theme_color VARCHAR(20) DEFAULT '#F97316'");
    console.log('Invoice and settings columns ready.');
  } catch (e) {
    console.warn('Invoice columns:', e.message);
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS estimates (
        id VARCHAR(100) PRIMARY KEY,
        estimate_number VARCHAR(100) NOT NULL,
        user_id INT REFERENCES users(id),
        client_id VARCHAR(50) REFERENCES clients(id) ON DELETE SET NULL,
        client_name VARCHAR(255) DEFAULT '',
        client_email VARCHAR(255) DEFAULT '',
        client_phone VARCHAR(50) DEFAULT '',
        client_address TEXT DEFAULT '',
        project_title VARCHAR(255) DEFAULT '',
        project_scope TEXT DEFAULT '',
        assumptions TEXT DEFAULT '',
        exclusions TEXT DEFAULT '',
        items JSONB DEFAULT '[]',
        subtotal DECIMAL(15,2) DEFAULT 0,
        discount_percentage DECIMAL(5,2) DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) DEFAULT 0,
        valid_until DATE,
        status VARCHAR(50) DEFAULT 'draft',
        notes TEXT DEFAULT '',
        terms_conditions JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Estimates table ready.');
  } catch (e) {
    console.warn('Estimates table:', e.message);
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_sms (
        id VARCHAR(80) PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        send_at TIMESTAMPTZ NOT NULL,
        client_ids JSONB NOT NULL DEFAULT '[]',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        error TEXT,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_scheduled_sms_due ON scheduled_sms (send_at) WHERE status IN ('pending', 'processing')`
    );
    console.log('Scheduled SMS table ready.');
  } catch (e) {
    console.warn('scheduled_sms table:', e.message);
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id VARCHAR(80) PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_name VARCHAR(255) NOT NULL,
        event_date DATE NOT NULL,
        event_time TIME,
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON calendar_events (user_id, event_date, event_time)`
    );
    console.log('Calendar events table ready.');
  } catch (e) {
    console.warn('calendar_events table:', e.message);
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(80) PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        client_id VARCHAR(80) REFERENCES clients(id) ON DELETE SET NULL,
        price DECIMAL(15,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(80) PRIMARY KEY,
        project_id VARCHAR(80) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        description TEXT DEFAULT '',
        status VARCHAR(20) NOT NULL DEFAULT 'todo',
        assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
        due_date DATE,
        position INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS time_logs (
        id VARCHAR(80) PRIMARY KEY,
        task_id VARCHAR(80) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_comments (
        id VARCHAR(80) PRIMARY KEY,
        task_id VARCHAR(80) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_projects_user ON projects (user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasks_project_user ON tasks (project_id, user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_time_logs_task ON time_logs (task_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments (task_id)`);
    await pool.query(`DROP TABLE IF EXISTS project_expenses CASCADE`);
    await pool.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS hourly_rate`);
    console.log('Projects / tasks tables ready.');
  } catch (e) {
    console.warn('projects tables:', e.message);
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_id, name)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(512) NOT NULL,
        file_type VARCHAR(255) NOT NULL DEFAULT 'application/octet-stream',
        file_size BIGINT NOT NULL DEFAULT 0,
        file_path TEXT NOT NULL,
        uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
        folder_id INT REFERENCES folders(id) ON DELETE SET NULL,
        linked_type VARCHAR(20) DEFAULT NULL,
        linked_id VARCHAR(100) DEFAULT NULL,
        tags TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query('ALTER TABLE files ADD COLUMN IF NOT EXISTS folder_id INT REFERENCES folders(id) ON DELETE SET NULL');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_files_user_created ON files (user_id, created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_files_user_link ON files (user_id, linked_type, linked_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_files_folder ON files (user_id, folder_id)');
    console.log('Files table ready.');
  } catch (e) {
    console.warn('files table:', e.message);
  }
  try {
    await pool.query('ALTER TABLE reminders ADD COLUMN IF NOT EXISTS reason VARCHAR(255) DEFAULT \'\'');
    await pool.query('ALTER TABLE reminders ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2) DEFAULT 0');
    console.log('Reminders columns (reason, amount) ready.');
  } catch (e) {
    console.warn('Reminders migration:', e.message);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://myaccounts.logozodev.com',
  credentials: true,
}));
// Increase JSON body limit to comfortably handle base64 logos and other settings
app.use(express.json({ limit: '20mb' }));

app.get('/api', (req, res) => {
  res.json({ status: 'ok', message: 'MyAccounts Backend is Running...' });
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', message: 'MyAccounts API', database: 'connected' });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
      database: 'disconnected',
      error: err.message,
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/incomes', incomesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/bank-details', bankDetailsRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/cars', carsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/estimates', estimatesRoutes);
app.use('/api/calendar-events', calendarEventsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/project-tasks', projectTasksRoutes);
app.use('/api/files', filesRoutes);

const HOST = '0.0.0.0'; // Required for Docker: listen on all interfaces

initDb()
  .catch((err) => {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  })
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`MyAccounts API running on ${HOST}:${PORT}`);
    });
    const SCHEDULED_SMS_MS = 60 * 1000;
    const runScheduledSms = () => {
      processDueScheduledSms().catch((e) => console.error('[scheduled SMS worker]', e));
    };
    setInterval(runScheduledSms, SCHEDULED_SMS_MS);
    setTimeout(runScheduledSms, 8000);
  });
