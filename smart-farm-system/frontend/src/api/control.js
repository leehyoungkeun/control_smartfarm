/**
 * 제어 API
 */
import api from './client';
import { getConnectionMode } from './client';

export const controlApi = {
  emergencyStop: (farmId) => {
    if (getConnectionMode() === 'local') return api.post('/control/emergency-stop');
    return api.post(`/farms/${farmId}/control/emergency-stop`);
  },
  start: (farmId) => {
    if (getConnectionMode() === 'local') return api.post('/control/start');
    return api.post(`/farms/${farmId}/control/start`);
  },
  stop: (farmId) => {
    if (getConnectionMode() === 'local') return api.post('/control/stop');
    return api.post(`/farms/${farmId}/control/stop`);
  },
  manual: (farmId, data) => {
    if (getConnectionMode() === 'local') return api.post('/control/manual', data);
    return api.post(`/farms/${farmId}/control/manual`, data);
  },
};
