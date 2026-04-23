import * as repo from '../repositories/expenses.repository.js';
import { AppError } from '../lib/AppError.js';

const toExpense = (row) => ({
  id: row.id,
  category: row.category || 'Other',
  amount: parseFloat(row.amount),
  currency: row.currency || 'LKR',
  date: row.date,
  notes: row.notes || '',
  paymentMethod: row.payment_method || 'cash',
  isRecurring: row.is_recurring || false,
  recurringFrequency: row.recurring_frequency || 'monthly',
  recurringEndDate: row.recurring_end_date,
  recurringNotes: row.recurring_notes || '',
  receipt: row.receipt,
  createdAt: row.created_at,
});

const genId = () =>
  `EXP-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const listExpenses = async (userId) => {
  const { rows } = await repo.findAllByUser(userId);
  return rows.map(toExpense);
};

export const createExpense = async (userId, d) => {
  const id = genId();
  await repo.insert(id, userId, d);
  const { rows } = await repo.findById(id);
  return toExpense(rows[0]);
};

export const updateExpense = async (userId, id, d) => {
  await repo.update(id, userId, d);
  const { rows } = await repo.findByIdAndUser(id, userId);
  if (!rows[0]) throw new AppError('Expense not found', 404);
  return toExpense(rows[0]);
};

export const deleteExpense = async (userId, id) => {
  const { rowCount } = await repo.remove(id, userId);
  if (rowCount === 0) throw new AppError('Expense not found', 404);
  return { success: true };
};
