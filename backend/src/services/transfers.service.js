import * as repo from '../repositories/transfers.repository.js';
import { AppError } from '../lib/AppError.js';

const toTransfer = (row) => ({
  id: row.id,
  fromAccount: row.from_account,
  toAccount: row.to_account,
  amount: parseFloat(row.amount),
  date: row.date,
  notes: row.notes || '',
  createdAt: row.created_at,
});

const genId = () =>
  `TRF-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const listTransfers = async (userId) => {
  const { rows } = await repo.findAllByUser(userId);
  return rows.map(toTransfer);
};

export const createTransfer = async (userId, { fromAccount, toAccount, amount, date, notes }) => {
  const id = genId();
  await repo.insert(id, userId, fromAccount, toAccount, Number(amount) || 0, date || new Date().toISOString(), notes || '');
  const { rows } = await repo.findByIdAndUser(id, userId);
  return toTransfer(rows[0]);
};

export const deleteTransfer = async (userId, id) => {
  const { rowCount } = await repo.remove(id, userId);
  if (rowCount === 0) throw new AppError('Transfer not found', 404);
  return { success: true };
};
