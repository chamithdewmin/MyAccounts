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
import bcrypt from 'bcryptjs';
import pool from './config/db.js';

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

  // Create default users if they don't exist (before migration so user_id refs work)
  const adminHash = await bcrypt.hash('admin123', 10);
  const chamithHash = await bcrypt.hash('chamith123', 10);
  await pool.query(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
    ['admin@gmail.com', adminHash, 'Admin']
  );
  await pool.query(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
    ['chamith@myaccounts.com', chamithHash, 'Chamith']
  );
  console.log('Default users ready: admin@gmail.com, chamith@myaccounts.com');

  // Add user_id for per-user data isolation
  try {
    const migratePath = path.join(__dirname, '..', 'scripts', 'migrate-user-id.sql');
    const migrate = fs.readFileSync(migratePath, 'utf8');
    await pool.query(migrate);
    console.log('Per-user data isolation enabled.');
  } catch (migErr) {
    console.warn('Migration warning (app will continue):', migErr.message);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://myaccounts.logozodev.com',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

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
app.use('/api/assets', assetsRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/cars', carsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/users', usersRoutes);

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
  });
