/**
 * MyAccounts API client
 * Base URL: same domain /api when deployed, or VITE_API_URL env
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const getToken = () => localStorage.getItem('token');

const request = async (path, options = {}) => {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
};

export const api = {
  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    me: () => request('/auth/me'),
  },
  clients: {
    list: () => request('/clients'),
    create: (data) => request('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/clients/${id}`, { method: 'DELETE' }),
  },
  incomes: {
    list: () => request('/incomes'),
    create: (data) => request('/incomes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/incomes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/incomes/${id}`, { method: 'DELETE' }),
  },
  expenses: {
    list: () => request('/expenses'),
    create: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  },
  invoices: {
    list: () => request('/invoices'),
    create: (data) => request('/invoices', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id, status) => request(`/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    delete: (id) => request(`/invoices/${id}`, { method: 'DELETE' }),
  },
  settings: {
    get: () => request('/settings'),
    update: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },
  assets: {
    list: () => request('/assets'),
    create: (data) => request('/assets', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/assets/${id}`, { method: 'DELETE' }),
  },
  loans: {
    list: () => request('/loans'),
    create: (data) => request('/loans', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/loans/${id}`, { method: 'DELETE' }),
  },
  cars: {
    list: () => request('/cars'),
    create: (data) => request('/cars', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/cars/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/cars/${id}`, { method: 'DELETE' }),
  },
  customers: {
    list: () => request('/customers'),
    create: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
  },
  orders: {
    list: () => request('/orders'),
    create: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  },
  users: {
    list: () => request('/users'),
    create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  },
};

export const useApi = () => !!import.meta.env.VITE_API_URL || window.location.origin.includes('myaccounts.logozodev.com');
