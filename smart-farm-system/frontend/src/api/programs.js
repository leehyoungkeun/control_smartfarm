/**
 * 프로그램 API
 */
import api from './client';
import { getConnectionMode } from './client';

export const programsApi = {
  list: (farmId) => {
    if (getConnectionMode() === 'local') return api.get('/programs');
    return api.get(`/farms/${farmId}/programs`);
  },
  get: (farmId, number) => {
    if (getConnectionMode() === 'local') return api.get(`/programs/${number}`);
    return api.get(`/farms/${farmId}/programs/${number}`);
  },
  update: (farmId, number, data) => {
    if (getConnectionMode() === 'local') return api.put(`/programs/${number}`, data);
    return api.put(`/farms/${farmId}/programs/${number}`, data);
  },
};
