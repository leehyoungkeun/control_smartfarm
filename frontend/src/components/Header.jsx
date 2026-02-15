/**
 * 대시보드 헤더
 * 높이 36px, 터치패널 최적화
 * 왼쪽: 농장명, 중앙: 메뉴 아이콘 8개, 오른쪽: 시계 + 연결 상태
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Typography, Tooltip } from '@mui/material';
import {
  Settings as SettingsIcon,
  ListAlt as ProgramIcon,
  Lock as LockIcon,
  Build as ManualIcon,
  BarChart as ChartIcon,
  NotificationsActive as AlarmIcon,
  Straighten as CalibrationIcon,
  RestartAlt as ResetIcon,
  ArrowBack as BackIcon,
  FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import useConnectionMode from '../hooks/useConnectionMode';
import useSystemStore from '../store/systemStore';

/**
 * Header 컴포넌트
 * @param {string} farmName - 농장 이름 (기본값: '스마트팜')
 * @param {string} farmId - 농장 ID (원격 모드에서 라우팅에 사용)
 * @param {function} onPasswordDialog - 잠금 아이콘 클릭 시 비밀번호 다이얼로그 열기 콜백
 */
const Header = ({ farmName = '스마트팜', farmId, onPasswordDialog }) => {
  const navigate = useNavigate();
  const mode = useConnectionMode();
  const wsConnected = useSystemStore((state) => state.wsConnected);

  // 실시간 시계 상태
  const [currentTime, setCurrentTime] = useState(new Date());

  // 1초마다 시계 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // HH:MM:SS 형식으로 시간 포맷
  const formatTime = (date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  /**
   * 접속 모드에 따라 네비게이션 경로 생성
   * local 모드: /path
   * remote 모드: /farm/${farmId}/path
   */
  const getPath = (path) => {
    if (mode === 'remote' && farmId) {
      return `/farm/${farmId}${path}`;
    }
    return path;
  };

  // 메뉴 아이콘 정의 (8개)
  const menuItems = [
    { icon: <SettingsIcon sx={{ fontSize: 20 }} />, tooltip: '설정', action: () => navigate(getPath('/settings')) },
    { icon: <ProgramIcon sx={{ fontSize: 20 }} />, tooltip: '프로그램', action: () => navigate(getPath('/programs')) },
    { icon: <LockIcon sx={{ fontSize: 20 }} />, tooltip: '잠금', action: () => onPasswordDialog?.() },
    { icon: <ManualIcon sx={{ fontSize: 20 }} />, tooltip: '수동 제어', action: () => navigate(getPath('/manual')) },
    { icon: <ChartIcon sx={{ fontSize: 20 }} />, tooltip: '일일 요약', action: () => navigate(getPath('/daily-summary')) },
    { icon: <AlarmIcon sx={{ fontSize: 20 }} />, tooltip: '경보', action: () => navigate(getPath('/alarms')) },
    { icon: <CalibrationIcon sx={{ fontSize: 20 }} />, tooltip: '교정', action: () => {} },
    { icon: <ResetIcon sx={{ fontSize: 20 }} />, tooltip: '리셋', action: () => {} },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '36px',
        minHeight: '36px',
        maxHeight: '36px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E0E0E0',
        px: 1,
      }}
    >
      {/* 왼쪽 영역: 뒤로가기(원격 모드) + 농장명 */}
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 120 }}>
        {mode === 'remote' && (
          <IconButton
            size="small"
            onClick={() => navigate('/')}
            sx={{ width: 28, height: 28, mr: 0.5 }}
          >
            <BackIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 'bold',
            color: '#212121',
            whiteSpace: 'nowrap',
          }}
        >
          {farmName}
        </Typography>
      </Box>

      {/* 중앙 영역: 메뉴 아이콘 8개 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        {menuItems.map((item, index) => (
          <Tooltip key={index} title={item.tooltip} arrow>
            <IconButton
              size="small"
              onClick={item.action}
              sx={{
                width: 32,
                height: 32,
                color: '#424242',
                '&:hover': {
                  backgroundColor: '#F5F5F5',
                },
              }}
            >
              {item.icon}
            </IconButton>
          </Tooltip>
        ))}
      </Box>

      {/* 오른쪽 영역: 시계 + 연결 상태 */}
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 120, justifyContent: 'flex-end' }}>
        <Typography
          sx={{
            fontSize: 12,
            fontFamily: 'monospace',
            color: '#424242',
            mr: 1,
          }}
        >
          {formatTime(currentTime)}
        </Typography>
        {/* 연결 상태 표시 점 (초록: 연결됨, 빨강: 미연결) */}
        <Tooltip title={wsConnected ? '연결됨' : '연결 끊김'} arrow>
          <DotIcon
            sx={{
              fontSize: 12,
              color: wsConnected ? '#27AE60' : '#E74C3C',
            }}
          />
        </Tooltip>
      </Box>
    </Box>
  );
};

export default Header;
