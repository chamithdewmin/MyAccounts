import * as repo from '../repositories/incomes.repository.js';
import { AppError } from '../lib/AppError.js';

const toIncome = (row) => ({
  id: row.id,
  clientId: row.client_id,
  clientName: row.client_name || '',
  serviceType: row.service_type || '',
  paymentMethod: row.payment_method || 'cash',
  amount: parseFloat(row.amount),
  currency: row.currency || 'LKR',
  date: row.date,
  notes: row.notes || '',
  isRecurring: row.is_recurring || false,
  recurringFrequency: row.recurring_frequency || 'monthly',
  recurringEndDate: row.recurring_end_date,
  recurringNotes: row.recurring_notes || '',
  createdAt: row.created_at,
});

const genId = () =>
  `INC-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const listIncomes = async (userId) => {
  const { rows } = await repo.findAllByUser(userId);
  return rows.map(toIncome);
};

export const createIncome = async (userId, d) => {
  const id = genId();
  await repo.insert(id, userId, d);
  const { rows } = await repo.findById(id);
  return toIncome(rows[0]);
};

export const updateIncome = async (userId, id, d) => {
  await repo.update(id, userId, d);
  const { rows } = await repo.findByIdAndUser(id, userId);
  if (!rows[0]) throw new AppError('Income record not found', 404);
  return toIncome(rows[0]);
};

export const deleteIncome = async (userId, id) => {
  const { rowCount } = await repo.remove(id, userId);
  if (rowCount === 0) throw new AppError('Income record not found', 404);
  return { success: true };
};
