import express from 'express';
import cors from 'cors';
import compression from 'compression';
import pool from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';

// Routes
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
import storageRoutes from './routes/storage.js';

const app = express();

// ── Global middleware ──────────────────────────────────────────────────────────
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://myaccounts.logozodev.com',
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use('/api', apiLimiter);

// ── Info + health ──────────────────────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({ status: 'ok', message: 'MyAccounts Backend is Running...' });
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', message: 'MyAccounts API', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', message: 'Database connection failed', database: 'disconnected', error: err.message });
  }
});

// ── Auth routes (stricter rate limit) ─────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);

// ── API routes ─────────────────────────────────────────────────────────────────
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
app.use('/api/storage', storageRoutes);

// ── Global error handler (MUST be last) ───────────────────────────────────────
app.use(errorHandler);

export default app;
