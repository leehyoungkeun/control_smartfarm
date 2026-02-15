/**
 * 비밀번호 변경 다이얼로그
 * 현재 비밀번호 확인 후 새 비밀번호로 변경
 *
 * Props:
 * - open: 다이얼로그 표시 여부
 * - onClose: 다이얼로그 닫기 콜백
 *
 * 검증 규칙:
 * - 새 비밀번호: 최소 4자 이상
 * - 새 비밀번호와 확인 비밀번호 일치 여부
 *
 * API: PUT /api/auth/change-password
 */
import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Snackbar,
  Alert,
  Typography,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import useApi from '../hooks/useApi';

const PasswordDialog = ({ open, onClose }) => {
  const api = useApi();

  // --- 입력 필드 상태 ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --- 비밀번호 표시/숨김 토글 ---
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- 에러 및 상태 관리 ---
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- 성공 스낵바 ---
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  /**
   * 폼 초기화
   * 다이얼로그를 닫을 때 모든 입력값과 상태를 초기화
   */
  const resetForm = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setLoading(false);
  }, []);

  /**
   * 다이얼로그 닫기 처리
   * 폼 초기화 후 부모 컴포넌트의 onClose 호출
   */
  const handleClose = useCallback(() => {
    resetForm();
    onClose?.();
  }, [resetForm, onClose]);

  /**
   * 입력값 검증
   * @returns {boolean} 검증 통과 여부
   */
  const validate = () => {
    // 현재 비밀번호 필수
    if (!currentPassword) {
      setError('현재 비밀번호를 입력하세요.');
      return false;
    }
    // 새 비밀번호 최소 4자
    if (newPassword.length < 4) {
      setError('새 비밀번호는 최소 4자 이상이어야 합니다.');
      return false;
    }
    // 새 비밀번호와 확인 일치 여부
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return false;
    }
    return true;
  };

  /**
   * 비밀번호 변경 요청 처리
   */
  const handleSubmit = async () => {
    setError('');

    // 입력값 검증
    if (!validate()) return;

    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      // 성공: 스낵바 표시 후 다이얼로그 닫기
      setSnackbarOpen(true);
      handleClose();
    } catch (err) {
      // 서버 에러 메시지 표시
      const serverMessage = err.response?.data?.message;
      setError(serverMessage || '비밀번호 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enter 키로 제출 처리
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '12px' },
        }}
      >
        {/* ── 다이얼로그 제목 ── */}
        <DialogTitle sx={{ fontSize: 18, fontWeight: 'bold', pb: 1 }}>
          비밀번호 변경
        </DialogTitle>

        <DialogContent sx={{ pt: '8px !important' }}>
          {/* ── 에러 메시지 표시 ── */}
          {error && (
            <Typography
              sx={{
                color: '#E74C3C',
                fontSize: 13,
                mb: 2,
                p: 1,
                backgroundColor: '#FFEBEE',
                borderRadius: '4px',
              }}
            >
              {error}
            </Typography>
          )}

          {/* ── 현재 비밀번호 입력 ── */}
          <TextField
            label="현재 비밀번호"
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            fullWidth
            sx={{
              mb: 2,
              '& .MuiInputBase-root': { height: 44 },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    edge="end"
                    sx={{ width: 44, height: 44 }}
                  >
                    {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* ── 새 비밀번호 입력 ── */}
          <TextField
            label="새 비밀번호"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            fullWidth
            helperText="최소 4자 이상"
            sx={{
              mb: 2,
              '& .MuiInputBase-root': { height: 44 },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    edge="end"
                    sx={{ width: 44, height: 44 }}
                  >
                    {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* ── 새 비밀번호 확인 입력 ── */}
          <TextField
            label="새 비밀번호 확인"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            fullWidth
            sx={{
              '& .MuiInputBase-root': { height: 44 },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    edge="end"
                    sx={{ width: 44, height: 44 }}
                  >
                    {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>

        {/* ── 다이얼로그 버튼 ── */}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={handleClose}
            disabled={loading}
            sx={{ height: 44, minWidth: 80, fontWeight: 'bold' }}
          >
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            sx={{ height: 44, minWidth: 80, fontWeight: 'bold' }}
          >
            {loading ? '변경 중...' : '변경'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 성공 스낵바 ── */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          비밀번호가 성공적으로 변경되었습니다.
        </Alert>
      </Snackbar>
    </>
  );
};

export default PasswordDialog;
