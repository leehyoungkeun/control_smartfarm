/**
 * 인증 훅
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import useAuthStore from '../stores/authStore';
import useSystemStore from '../stores/systemStore';
import useConnectionMode from './useConnectionMode';
import toast from 'react-hot-toast';

const useAuth = () => {
  const navigate = useNavigate();
  const { token, user, isAuthenticated, login: storeLogin, logout: storeLogout } = useAuthStore();
  const resetSystem = useSystemStore((s) => s.reset);
  const { isLocal } = useConnectionMode();

  const login = useCallback(async (identifier, password) => {
    // 로컬: username, 원격: email
    const body = isLocal
      ? { username: identifier, password }
      : { email: identifier, password };

    const result = await authApi.login(body);
    storeLogin(result.token, result.user);
    toast.success(`${result.user.username}님, 환영합니다`);
    navigate('/');
    return result.user;
  }, [isLocal, navigate, storeLogin]);

  const logout = useCallback(() => {
    storeLogout();
    resetSystem();
    navigate('/login');
  }, [navigate, storeLogout, resetSystem]);

  const changePassword = useCallback(async (data) => {
    await authApi.changePassword(data);
    toast.success('비밀번호가 변경되었습니다');
  }, []);

  return { token, user, isAuthenticated, login, logout, changePassword, isLocal };
};

export default useAuth;
