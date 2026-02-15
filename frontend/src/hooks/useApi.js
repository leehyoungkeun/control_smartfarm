/**
 * API 클라이언트 훅
 * 접속 모드에 따라 baseURL 자동 선택
 * 인증 토큰 자동 주입 + 401 시 자동 로그아웃
 */
import { useMemo } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import useConnectionMode from './useConnectionMode';

const CLOUD_API_URL = import.meta.env.VITE_CLOUD_API_URL || 'http://localhost:3000';
const LOCAL_API_URL = import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:3001';

const useApi = () => {
  const mode = useConnectionMode();

  return useMemo(() => {
    const baseURL = mode === 'local'
      ? `${LOCAL_API_URL}/api`
      : `${CLOUD_API_URL}/api`;

    const instance = axios.create({ baseURL, timeout: 10000 });

    // 요청 인터셉터: JWT 토큰 자동 주입
    instance.interceptors.request.use((config) => {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // 응답 인터셉터: 401 시 자동 로그아웃
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          useAuthStore.getState().logout();
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, [mode]);
};

export default useApi;
