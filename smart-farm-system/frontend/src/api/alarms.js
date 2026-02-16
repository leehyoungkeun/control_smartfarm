/**
 * 경보 API
 */
import api from './client';
import { getConnectionMode } from './client';

export const alarmsApi = {
  list: (farmId, params = {}) => {
    if (getConnectionMode() === 'local') return api.get('/alarms', { params });
    return api.get(`/farms/${farmId}/alarms`, { params });
  },
  active: (farmId) => {
    if (getConnectionMode() === 'local') return api.get('/alarms/active');
    return api.get(`/farms/${farmId}/alarms/active`);
  },
  resolve: (farmId, alarmId) => {
    if (getConnectionMode() === 'local') return api.put(`/alarms/${alarmId}/resolve`);
    return api.put(`/farms/${farmId}/alarms/${alarmId}/resolve`);
  },
};
