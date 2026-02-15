/**
 * 인증 훅
 * 접속 모드에 따라 다른 API 엔드포인트로 로그인
 */
import useAuthStore from '../store/authStore';
import useConnectionMode from './useConnectionMode';
import useApi from './useApi';

const useAuth = () => {
  const mode = useConnectionMode();
  const { token, user, isAuthenticated, login: storeLogin, logout } = useAuthStore();
  const api = useApi();

  const login = async (identifier, password) => {
    // 로컬: username+password, 원격: email+password
    const body = mode === 'local'
      ? { username: identifier, password }
      : { email: identifier, password };

    const res = await api.post('/auth/login', body);
    const { token: newToken, user: newUser } = res.data.data;
    storeLogin(newToken, newUser);
    return newUser;
  };

  return { token, user, isAuthenticated, login, logout, mode };
};

export default useAuth;
