/**
 * 로그인 페이지
 * 로컬 모드: username + password → RPi API
 * 원격 모드: email + password → 사무실 서버 API
 */
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Sprout, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button, Input } from '../components/ui';
import useAuth from '../hooks/useAuth';
import useConnectionMode from '../hooks/useConnectionMode';

const Login = () => {
  const { isLocal } = useConnectionMode();
  const { isAuthenticated, login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError(isLocal ? '사용자명과 비밀번호를 입력해주세요.' : '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await login(identifier, password);
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4">
            <Sprout className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">스마트팜 관수 제어</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isLocal ? '터치패널 로그인' : '케이그린텍 원격 제어 시스템'}
          </p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-danger-50 border border-danger-200">
              <AlertCircle className="w-4 h-4 text-danger-500 shrink-0" />
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={isLocal ? '사용자명' : '이메일'}
              type={isLocal ? 'text' : 'email'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={isLocal ? '사용자명을 입력하세요' : '이메일을 입력하세요'}
              size="lg"
              autoFocus
            />

            <div className="relative">
              <Input
                label="비밀번호"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                size="lg"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              로그인
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          케이그린텍 스마트팜 시스템 v1.0
        </p>
      </div>
    </div>
  );
};

export default Login;
