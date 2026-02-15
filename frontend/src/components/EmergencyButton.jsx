/**
 * 하단 제어 버튼 영역
 * 높이 50px, 3개 버튼 가로 배치
 * 비상정지(빨강), 동작(초록), 수동동작(파랑)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import useConnectionMode from '../hooks/useConnectionMode';
import useApi from '../hooks/useApi';

/**
 * EmergencyButton 컴포넌트
 * 비상정지, 동작, 수동동작 3개 버튼을 가로로 배치
 * @param {string} farmId - 농장 ID (원격 모드에서 API 경로에 사용)
 */
const EmergencyButton = ({ farmId }) => {
  const navigate = useNavigate();
  const mode = useConnectionMode();
  const api = useApi();

  // 비상정지 확인 다이얼로그 상태
  const [confirmOpen, setConfirmOpen] = useState(false);

  /**
   * 접속 모드에 따라 API 경로 생성
   * @param {string} path - API 경로
   * @returns {string} 완전한 API 경로
   */
  const getApiPath = (path) => {
    if (mode === 'remote' && farmId) {
      return `/farms/${farmId}/control${path}`;
    }
    return `/control${path}`;
  };

  /**
   * 접속 모드에 따라 네비게이션 경로 생성
   * @param {string} path - 페이지 경로
   * @returns {string} 완전한 네비게이션 경로
   */
  const getNavPath = (path) => {
    if (mode === 'remote' && farmId) {
      return `/farm/${farmId}${path}`;
    }
    return path;
  };

  // 비상정지 실행
  const handleEmergencyStop = async () => {
    try {
      await api.post(getApiPath('/emergency-stop'));
    } catch (error) {
      console.error('비상정지 요청 실패:', error);
    } finally {
      setConfirmOpen(false);
    }
  };

  // 동작 시작
  const handleStart = async () => {
    try {
      await api.post(getApiPath('/start'));
    } catch (error) {
      console.error('동작 시작 요청 실패:', error);
    }
  };

  // 수동동작 페이지로 이동
  const handleManual = () => {
    navigate(getNavPath('/manual'));
  };

  // 공통 버튼 스타일
  const buttonStyle = {
    flex: 1,
    height: 44,
    fontSize: 15,
    fontWeight: 'bold',
    borderRadius: '8px',
    textTransform: 'none',
  };

  return (
    <>
      {/* 버튼 영역: 3개 버튼 가로 배치 */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          width: '100%',
          height: 50,
          alignItems: 'center',
        }}
      >
        {/* 비상정지 버튼 (빨강) */}
        <Button
          variant="contained"
          onClick={() => setConfirmOpen(true)}
          sx={{
            ...buttonStyle,
            backgroundColor: '#E74C3C',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#C0392B',
            },
          }}
        >
          비상정지
        </Button>

        {/* 동작 버튼 (초록) */}
        <Button
          variant="contained"
          onClick={handleStart}
          sx={{
            ...buttonStyle,
            backgroundColor: '#27AE60',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#219A52',
            },
          }}
        >
          동작
        </Button>

        {/* 수동동작 버튼 (파랑) */}
        <Button
          variant="contained"
          onClick={handleManual}
          sx={{
            ...buttonStyle,
            backgroundColor: '#2E75B6',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#245F95',
            },
          }}
        >
          수동동작
        </Button>
      </Box>

      {/* 비상정지 확인 다이얼로그 */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        aria-labelledby="emergency-dialog-title"
      >
        <DialogTitle id="emergency-dialog-title" sx={{ color: '#E74C3C', fontWeight: 'bold' }}>
          비상정지
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            비상정지를 실행하시겠습니까?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          {/* 취소 버튼 */}
          <Button onClick={() => setConfirmOpen(false)} color="inherit">
            취소
          </Button>
          {/* 확인 버튼 */}
          <Button
            onClick={handleEmergencyStop}
            variant="contained"
            sx={{
              backgroundColor: '#E74C3C',
              '&:hover': { backgroundColor: '#C0392B' },
            }}
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EmergencyButton;
