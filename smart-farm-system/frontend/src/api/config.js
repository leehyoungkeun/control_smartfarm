/**
 * 시스템 설정 API
 */
import api from './client';
import { getConnectionMode } from './client';

export const configApi = {
  get: (farmId) => {
    if (getConnectionMode() === 'local') return api.get('/config');
    return api.get(`/farms/${farmId}/config`);
  },
  update: (farmId, data) => {
    if (getConnectionMode() === 'local') return api.put('/config', data);
    return api.put(`/farms/${farmId}/config`, data);
  },
  status: () => api.get('/status'),
  sensors: (params = {}) => api.get('/sensors', { params }),
  dailySummary: (farmId, date) => {
    if (getConnectionMode() === 'local') return api.get('/daily-summary', { params: { date } });
    return api.get(`/farms/${farmId}/daily-summary`, { params: { date } });
  },
};
