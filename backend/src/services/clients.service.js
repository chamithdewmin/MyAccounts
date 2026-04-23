import * as repo from '../repositories/clients.repository.js';
import { AppError } from '../lib/AppError.js';

const toClient = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email || '',
  phone: row.phone || '',
  address: row.address || '',
  projects: row.projects || [],
  createdAt: row.created_at,
});

const genId = () =>
  `CL-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const listClients = async (userId) => {
  const { rows } = await repo.findAllByUser(userId);
  return rows.map(toClient);
};

export const createClient = async (userId, { name, email, phone, address, projects }) => {
  const id = genId();
  await repo.insert(id, userId, name?.trim() || '', email?.trim() || '', phone?.trim() || '', address?.trim() || '', projects);
  const { rows } = await repo.findById(id);
  return toClient(rows[0]);
};

export const updateClient = async (userId, id, data) => {
  await repo.update(id, userId, data);
  const { rows } = await repo.findByIdAndUser(id, userId);
  if (!rows[0]) throw new AppError('Client not found', 404);
  return toClient(rows[0]);
};

export const deleteClient = async (userId, id) => {
  const { rowCount } = await repo.remove(id, userId);
  if (rowCount === 0) throw new AppError('Client not found', 404);
  return { success: true };
};
