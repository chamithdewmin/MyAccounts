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
import pool from './config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initDb() {
  const sqlPath = path.join(__dirname, '..', 'scripts', 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('Database tables ready.');
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

initDb()
  .catch((err) => {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`MyAccounts API running on port ${PORT}`);
    });
  });
