/**
 * LOGOZODEV API client
 * Base URL: same domain /api when deployed, or VITE_API_URL env
 */
const normalizeApiBase = (raw) => {
  const fallback = '/api';
  const value = String(raw ?? '').trim();
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value) || value.startsWith('//')) return value.replace(/\/+$/, '');
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, '') || fallback;
};

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL);

export const getToken = () => localStorage.getItem('token');

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
    // Do not clear session on failed sign-in (401 from /auth/login)
    if (res.status === 401 && path !== '/auth/login') {
      localStorage.removeItem('token');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    const err = data.error || data.message || (data.data && (data.data.error || data.data.message)) || `HTTP ${res.status}`;
    const detail = data.detail ? ` — ${data.detail}` : '';
    const msg = typeof err === 'string' ? `${err}${detail}` : JSON.stringify(err);
    throw new Error(msg);
  }
  return data;
};

export const api = {
  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    me: () => request('/auth/me'),
    logout: (activityId) => request('/auth/logout', { method: 'POST', body: JSON.stringify({ activityId }) }),
    getActivity: (userId) => request(`/auth/activity${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`),
    getLoginActivity: () => request('/auth/login-activity'),
    getLoginActivityStats: () => request('/auth/login-activity/stats'),
    forgotPassword: (phone) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ phone }) }),
    verifyOtp: (phone, otp) => request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp }) }),
    resetPassword: (resetToken, newPassword) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ resetToken, newPassword }) }),
    sendResetDataOtp: () => request('/auth/send-reset-data-otp', { method: 'POST' }),
    confirmResetData: (otp) => request('/auth/confirm-reset-data', { method: 'POST', body: JSON.stringify({ otp }) }),
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
    get: (id) => request(`/invoices/${id}`),
    create: (data) => request('/invoices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateStatus: (id, status) => request(`/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    delete: (id) => request(`/invoices/${id}`, { method: 'DELETE' }),
  },
  estimates: {
    list: () => request('/estimates'),
    get: (id) => request(`/estimates/${id}`),
    create: (data) => request('/estimates', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/estimates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateStatus: (id, status) => request(`/estimates/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    convertToInvoice: (id) => request(`/estimates/${id}/convert-to-invoice`, { method: 'POST' }),
    delete: (id) => request(`/estimates/${id}`, { method: 'DELETE' }),
  },
  settings: {
    get: () => request('/settings'),
    update: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },
  bankDetails: {
    get: () => request('/bank-details'),
    save: (data) => request('/bank-details', { method: 'POST', body: JSON.stringify(data) }),
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
    update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  },
  sms: {
    getSettings: () => request('/sms/settings'),
    saveSettings: (data) => request('/sms/settings', { method: 'PUT', body: JSON.stringify(data) }),
    test: () => request('/sms/test', { method: 'POST' }),
    sendBulk: (data) => request('/sms/send-bulk', { method: 'POST', body: JSON.stringify(data) }),
    schedule: (data) => request('/sms/schedule', { method: 'POST', body: JSON.stringify(data) }),
    listScheduled: () => request('/sms/scheduled'),
    cancelScheduled: (id) =>
      request(`/sms/scheduled/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  calendarEvents: {
    list: () => request('/calendar-events'),
    create: (data) => request('/calendar-events', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) =>
      request(`/calendar-events/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/calendar-events/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  projects: {
    list: () => request('/projects'),
    get: (id) => request(`/projects/${encodeURIComponent(id)}`),
    create: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/projects/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    createTask: (projectId, data) =>
      request(`/projects/${encodeURIComponent(projectId)}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
    listExpenses: (projectId) => request(`/projects/${encodeURIComponent(projectId)}/expenses`),
    createExpense: (projectId, data) =>
      request(`/projects/${encodeURIComponent(projectId)}/expenses`, { method: 'POST', body: JSON.stringify(data) }),
    updateExpense: (projectId, expenseId, data) =>
      request(`/projects/${encodeURIComponent(projectId)}/expenses/${encodeURIComponent(expenseId)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteExpense: (projectId, expenseId) =>
      request(`/projects/${encodeURIComponent(projectId)}/expenses/${encodeURIComponent(expenseId)}`, {
        method: 'DELETE',
      }),
  },
  projectTasks: {
    get: (id) => request(`/project-tasks/${encodeURIComponent(id)}`),
    update: (id, data) =>
      request(`/project-tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/project-tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    startTimer: (id) =>
      request(`/project-tasks/${encodeURIComponent(id)}/timer/start`, { method: 'POST', body: JSON.stringify({}) }),
    stopTimer: (id) =>
      request(`/project-tasks/${encodeURIComponent(id)}/timer/stop`, { method: 'POST', body: JSON.stringify({}) }),
    addComment: (id, body) =>
      request(`/project-tasks/${encodeURIComponent(id)}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
  },
  files: {
    list: (params = {}) => {
      const q = new URLSearchParams();
      if (params.q) q.set('q', params.q);
      if (params.type) q.set('type', params.type);
      if (params.scope) q.set('scope', params.scope);
      if (params.folderId != null && params.folderId !== '') q.set('folder_id', String(params.folderId));
      const s = q.toString();
      return request(`/files${s ? `?${s}` : ''}`);
    },
    listFolders: () => request('/files/folders'),
    createFolder: (name) => request('/files/folders', { method: 'POST', body: JSON.stringify({ name }) }),
    renameFolder: (id, name) => request(`/files/folders/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    setFolderPassword: (id, payload) => request(`/files/folders/${id}/password`, { method: 'PATCH', body: JSON.stringify(payload) }),
    unlockFolder: (id, password) => request(`/files/folders/${id}/unlock`, { method: 'POST', body: JSON.stringify({ password }) }),
    deleteFolder: (id) => request(`/files/folders/${id}`, { method: 'DELETE' }),
    update: (id, data) => request(`/files/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/files/${id}`, { method: 'DELETE' }),
    /** XHR upload with progress 0–100; abort via signal */
    upload: (file, fields = {}, { onProgress, signal } = {}) =>
      new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const fd = new FormData();
        fd.append('file', file);
        if (fields.tags != null && fields.tags !== '') fd.append('tags', String(fields.tags));
        if (fields.folder_id != null && fields.folder_id !== '') fd.append('folder_id', String(fields.folder_id));
        if (fields.linked_type && fields.linked_id) {
          fd.append('linked_type', String(fields.linked_type));
          fd.append('linked_id', String(fields.linked_id));
        }
        const url = `${API_BASE}/files/upload`;
        xhr.open('POST', url);
        const token = getToken();
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) onProgress(Math.min(100, Math.round((100 * e.loaded) / e.total)));
        };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText || '{}');
            if (xhr.status >= 200 && xhr.status < 300) resolve(data);
            else reject(new Error(data.error || data.message || `HTTP ${xhr.status}`));
          } catch {
            reject(new Error(xhr.status >= 200 && xhr.status < 300 ? 'Invalid response' : `HTTP ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.onabort = () => reject(new Error('Upload cancelled'));
        if (signal) {
          if (signal.aborted) {
            reject(new Error('Upload cancelled'));
            return;
          }
          signal.addEventListener('abort', () => xhr.abort(), { once: true });
        }
        xhr.send(fd);
      }),
    fetchBlob: async (id, { inline = false } = {}) => {
      const url = `${API_BASE}/files/${id}/file${inline ? '?inline=1' : ''}`;
      const headers = {};
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        let msg = `HTTP ${res.status}`;
        try {
          const j = JSON.parse(errText);
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      return res.blob();
    },
  },
  storage: {
    overview: () => request('/storage/overview'),
  },
  transfers: {
    list: () => request('/transfers'),
    create: (data) => request('/transfers', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/transfers/${id}`, { method: 'DELETE' }),
  },
  reminders: {
    list: () => request('/reminders'),
    create: (data) => request('/reminders', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/reminders/${id}`, { method: 'DELETE' }),
  },
  ai: {
    getSummary: () => request('/ai/summary'),
    getSuggestions: () => request('/ai/suggestions', { method: 'POST', body: JSON.stringify({}) }),
    ask: (question) => request('/ai/ask', { method: 'POST', body: JSON.stringify({ question: question.trim() }) }),
  },
  backup: {
    getInfo: () => request('/backup/info'),
    getHistory: () => request('/backup/history'),
    create: () => request('/backup/create', { method: 'POST' }),
    download: (id) => `${API_BASE}/backup/download/${id}`,
    restore: (backupData) => request('/backup/restore', { method: 'POST', body: JSON.stringify({ backupData }) }),
    delete: (id) => request(`/backup/${id}`, { method: 'DELETE' }),
  },
};

export const useApi = () => !!import.meta.env.VITE_API_URL || window.location.origin.includes('myaccounts.LOGOZODEV.com');
