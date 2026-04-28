// frontend/src/lib/api.ts
import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = Cookies.get('token') || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  res => res,
  (err: AxiosError) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (!path.startsWith('/auth')) {
        Cookies.remove('token');
        localStorage.removeItem('token');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(err);
  }
);

// Auth APIs
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data).then(r => r.data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),
};

// App management APIs
export const appsApi = {
  list: () => api.get('/apps').then(r => r.data),
  create: (config: object) => api.post('/apps', config).then(r => r.data),
  get: (slug: string) => api.get(`/apps/${slug}`).then(r => r.data),
  update: (slug: string, config: object) => api.put(`/apps/${slug}`, config).then(r => r.data),
  delete: (slug: string) => api.delete(`/apps/${slug}`).then(r => r.data),
  validate: (config: object) => api.post('/apps/validate', config).then(r => r.data),
  getNotifications: (slug: string) => api.get(`/apps/${slug}/notifications`).then(r => r.data),
};

// Dynamic data APIs
export const dataApi = {
  list: (appSlug: string, entityId: string, params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    sort?: string;
    dir?: 'asc' | 'desc';
    filters?: object[];
  }) =>
    api.get(`/apps/${appSlug}/data/${entityId}`, { params }).then(r => r.data),

  get: (appSlug: string, entityId: string, recordId: string) =>
    api.get(`/apps/${appSlug}/data/${entityId}/${recordId}`).then(r => r.data),

  create: (appSlug: string, entityId: string, data: object) =>
    api.post(`/apps/${appSlug}/data/${entityId}`, data).then(r => r.data),

  update: (appSlug: string, entityId: string, recordId: string, data: object) =>
    api.put(`/apps/${appSlug}/data/${entityId}/${recordId}`, data).then(r => r.data),

  delete: (appSlug: string, entityId: string, recordId: string) =>
    api.delete(`/apps/${appSlug}/data/${entityId}/${recordId}`).then(r => r.data),

  exportCsv: (appSlug: string, entityId: string) =>
    `${BASE_URL}/api/apps/${appSlug}/data/${entityId}/export/csv`,
};

// CSV import APIs
export const csvApi = {
  preview: (appSlug: string, entityId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/apps/${appSlug}/csv/${entityId}/preview`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  import: (appSlug: string, entityId: string, file: File, columnMap: Record<string, string>) => {
    const form = new FormData();
    form.append('file', file);
    form.append('columnMap', JSON.stringify(columnMap));
    return api.post(`/apps/${appSlug}/csv/${entityId}/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  getImportStatus: (appSlug: string, importId: string) =>
    api.get(`/apps/${appSlug}/csv/imports/${importId}`).then(r => r.data),
};

// Admin APIs
export const adminApi = {
  // User management
  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string; isActive?: boolean }) =>
    api.get('/admin/users', { params }).then(r => r.data),
  
  getUser: (id: string) =>
    api.get(`/admin/users/${id}`).then(r => r.data),
  
  createUser: (data: { email: string; password?: string; name: string; role?: string; isActive?: boolean }) =>
    api.post('/admin/users', data).then(r => r.data),
  
  updateUser: (id: string, data: { name?: string; role?: string; isActive?: boolean; password?: string }) =>
    api.put(`/admin/users/${id}`, data).then(r => r.data),
  
  deleteUser: (id: string) =>
    api.delete(`/admin/users/${id}`).then(r => r.data),
  
  // Dashboard stats
  getStats: () =>
    api.get('/admin/stats').then(r => r.data),
};
