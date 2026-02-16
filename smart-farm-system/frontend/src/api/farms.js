/**
 * 농장 API
 */
import api from './client';

export const farmsApi = {
  list: () => api.get('/farms'),
  get: (id) => api.get(`/farms/${id}`),
  create: (data) => api.post('/farms', data),
  update: (id, data) => api.put(`/farms/${id}`, data),
  delete: (id) => api.delete(`/farms/${id}`),
};
