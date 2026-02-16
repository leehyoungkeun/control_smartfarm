/**
 * 관리자 API (원격 모드 전용)
 */
import api from './client';

export const adminApi = {
  overview: () => api.get('/admin/overview'),
  recentAlarms: () => api.get('/admin/alarms/recent'),
  offlineFarms: () => api.get('/admin/farms/offline'),

  // 사용자 관리
  users: {
    list: () => api.get('/users'),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    setFarms: (id, farms) => api.put(`/users/${id}/farms`, { farms }),
  },

  // 제어 로그
  controlLogs: (farmId, params = {}) => api.get(`/farms/${farmId}/control-logs`, { params }),
};
