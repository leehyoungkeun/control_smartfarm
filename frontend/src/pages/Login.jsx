/**
 * 로그인 페이지
 * 로컬 모드: username + password → RPi API
 * 원격 모드: email + password → 사무실 서버 API
 */
import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, Agriculture as FarmIcon } from '@mui/icons-material';
import useAuth from '../hooks/useAuth';
import useConnectionMode from '../hooks/useConnectionMode';

const Login = () => {
  const navigate = useNavigate();
  const mode = useConnectionMode();
  const { isAuthenticated, login } = useAuth();

  const [identifier, setIdentifier] = useState(''); // username(로컬) 또는 email(원격)
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError(mode === 'local' ? '사용자명과 비밀번호를 입력해주세요.' : '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await login(identifier, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#F5F5F5',
    }}>
      <Card sx={{ width: 400, p: 1 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <FarmIcon sx={{ fontSize: 48, color: '#27AE60', mb: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#212121' }}>
              스마트팜 관수 제어
            </Typography>
            <Typography variant="body2" sx={{ color: '#757575', mt: 0.5 }}>
              {mode === 'local' ? '터치패널 로그인' : '케이그린텍 원격 제어 시스템'}
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              label={mode === 'local' ? '사용자명' : '이메일'}
              type={mode === 'local' ? 'text' : 'email'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              fullWidth autoFocus
              sx={{ mb: 2 }}
            />
            <TextField
              label="비밀번호"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              sx={{ mb: 3 }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit" variant="contained" fullWidth disabled={loading}
              sx={{ py: 1.5, fontSize: 16, fontWeight: 'bold' }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : '로그인'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
