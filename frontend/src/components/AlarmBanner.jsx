/**
 * 경보 배너
 * 활성 경보가 있을 때 상단에 빨간 배너 표시
 * 경보가 없으면 렌더링하지 않음 (공간 차지 없음)
 */
import { Box, Typography } from '@mui/material';
import useSystemStore from '../store/systemStore';

/**
 * 깜빡임 애니메이션 키프레임 정의
 * 경보 배너에 시각적 주의 효과 적용
 */
const blinkKeyframes = {
  '@keyframes alarmBlink': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.6 },
  },
};

/**
 * AlarmBanner 컴포넌트
 * 활성 경보가 있을 때만 빨간색 경보 배너를 표시
 * 단일 경보: 경보 메시지 또는 타입 표시
 * 복수 경보: "경보 N건: {첫 번째 경보 타입}" 형식 표시
 */
const AlarmBanner = () => {
  const activeAlarms = useSystemStore((state) => state.activeAlarms);

  // 활성 경보가 없으면 렌더링하지 않음
  if (!activeAlarms || activeAlarms.length === 0) {
    return null;
  }

  /**
   * 경보 표시 텍스트 생성
   * 1건: 메시지 또는 타입 표시
   * 여러 건: "경보 N건: {첫 번째 타입}" 형식
   */
  const getAlarmText = () => {
    const firstAlarm = activeAlarms[0];
    const alarmLabel = firstAlarm.message || firstAlarm.alarm_type || firstAlarm.type || '알 수 없는 경보';

    if (activeAlarms.length === 1) {
      return alarmLabel;
    }
    return `경보 ${activeAlarms.length}건: ${alarmLabel}`;
  };

  return (
    <Box
      sx={{
        height: 28,
        minHeight: 28,
        maxHeight: 28,
        backgroundColor: '#E74C3C',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // 깜빡임 애니메이션 적용
        animation: 'alarmBlink 1s infinite',
        ...blinkKeyframes,
      }}
    >
      {/* 경보 텍스트 */}
      <Typography
        sx={{
          color: '#FFFFFF',
          fontSize: 13,
          fontWeight: 'bold',
          textAlign: 'center',
          px: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {getAlarmText()}
      </Typography>
    </Box>
  );
};

export default AlarmBanner;
