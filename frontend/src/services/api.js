import axios from 'axios';

const API = axios.create({
  baseURL: 'https://task-queue-gham.onrender.com/api',
  timeout: 10000,
});

API.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err.response?.data || err)
);

// ── Tasks ──────────────────────────────────────────────────────────────────────
export const taskAPI = {
  getAll: (params) => API.get('/tasks', { params }),
  getOne: (id) => API.get(`/tasks/${id}`),
  create: (data) => API.post('/tasks', data),
  retry: (id) => API.post(`/tasks/${id}/retry`),
  cancel: (id) => API.post(`/tasks/${id}/cancel`),
  delete: (id) => API.delete(`/tasks/${id}`),
  getStats: () => API.get('/tasks/stats'),
};

// ── Workers ────────────────────────────────────────────────────────────────────
export const workerAPI = {
  getAll: () => API.get('/workers'),
  delete: (workerId) => API.delete(`/workers/${workerId}`),
};

export default API;
