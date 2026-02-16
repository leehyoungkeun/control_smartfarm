/**
 * 인증 API
 */
import api from './client';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  refresh: () => api.post('/auth/refresh'),
};
