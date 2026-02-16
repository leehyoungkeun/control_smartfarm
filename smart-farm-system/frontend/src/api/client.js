/**
 * API 클라이언트 싱글톤
 * 모드(로컬/원격)에 따라 baseURL 자동 선택
 * 모든 응답에서 { success, data } 중 data만 반환
 */
import axios from 'axios';

const CLOUD_API_URL = import.meta.env.VITE_CLOUD_API_URL || 'http://localhost:3000';
const LOCAL_API_URL = import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:3001';

/** 현재 접속 모드 판별 */
export const getConnectionMode = () => {
  const envMode = import.meta.env.VITE_CONNECTION_MODE;
  if (envMode === 'local') return 'local';
  if (envMode === 'remote') return 'remote';
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
    return 'local';
  }
  return 'remote';
};

/** baseURL 결정 */
const getBaseURL = () => {
  const mode = getConnectionMode();
  return mode === 'local' ? `${LOCAL_API_URL}/api` : `${CLOUD_API_URL}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 요청 인터셉터: JWT 토큰 주입
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: data 언래핑 + 401 자동 로그아웃
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    // { success: true, data: ... } 형태면 data만 반환
    if (body && typeof body === 'object' && 'success' in body) {
      if (!body.success) {
        return Promise.reject(new Error(body.message || '요청 실패'));
      }
      return body.data !== undefined ? body.data : body;
    }
    return body;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const message = error.response?.data?.message || error.message || '네트워크 오류';
    return Promise.reject(new Error(message));
  },
);

export default api;
