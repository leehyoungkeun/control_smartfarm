/**
 * 좌측 상태 패널
 * 시스템 운전 상태, 펌프, 유량, 센서값 표시
 * 너비 180px, 전체 높이 사용
 */
import { Box, Typography } from '@mui/material';
import useSystemStore from '../store/systemStore';

/**
 * 비상정지 상태일 때 깜빡이는 애니메이션 키프레임
 * @keyframes blink - 0.5초 간격으로 투명도 전환
 */
const blinkKeyframes = {
  '@keyframes blink': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0 },
  },
};

/**
 * 운전 상태 텍스트 및 색상 변환
 * @param {string} state - RUNNING | STOPPED | EMERGENCY
 * @returns {{ text: string, color: string, blink: boolean }}
 */
const getOperationState = (state) => {
  switch (state) {
    case 'RUNNING':
      return { text: '동작', color: '#27AE60', blink: false };
    case 'EMERGENCY':
      return { text: '비상정지', color: '#E74C3C', blink: true };
    case 'STOPPED':
    default:
      return { text: '정지', color: '#757575', blink: false };
  }
};

/**
 * 동작/정지 상태 텍스트 및 색상 변환
 * @param {boolean} isActive - 동작 여부
 * @returns {{ text: string, color: string }}
 */
const getActiveState = (isActive) => ({
  text: isActive ? '동작' : '정지',
  color: isActive ? '#27AE60' : '#757575',
});

/**
 * 개별 상태 항목 컴포넌트
 * @param {string} label - 항목 라벨
 * @param {string} value - 항목 값
 * @param {string} color - 값 텍스트 색상
 * @param {boolean} blink - 깜빡임 적용 여부
 */
const StatusItem = ({ label, value, color = '#212121', blink = false }) => (
  <Box sx={{ mb: 0.75 }}>
    {/* 항목 라벨 */}
    <Typography
      sx={{
        color: '#757575',
        fontSize: 10,
        lineHeight: 1.2,
        mb: 0,
      }}
    >
      {label}
    </Typography>
    {/* 항목 값 */}
    <Typography
      sx={{
        color: color,
        fontSize: 14,
        fontWeight: 'bold',
        lineHeight: 1.3,
        mb: '6px',
        ...(blink && {
          animation: 'blink 0.5s infinite',
        }),
      }}
    >
      {value}
    </Typography>
  </Box>
);

/**
 * StatusPanel 컴포넌트
 * 스토어에서 실시간 상태 데이터를 읽어 표시
 */
const StatusPanel = () => {
  const status = useSystemStore((state) => state.status);
  const sensors = useSystemStore((state) => state.sensors);

  // 운전 상태 변환
  const operationState = getOperationState(status?.operation_state);

  // 현재 프로그램 번호 (0보다 크면 녹색)
  const currentProgram = status?.current_program || 0;
  const programColor = currentProgram > 0 ? '#27AE60' : '#212121';

  // 양액공급밸브 상태
  const nutrientValve = getActiveState(status?.nutrient_valve);

  // 원수공급펌프 상태
  const drainPump = getActiveState(status?.drain_pump);

  // 관수공급펌프 상태
  const irrigationPump = getActiveState(status?.irrigation_pump);

  // 양액교반기 상태
  const mixerMotor = getActiveState(status?.mixer_motor);

  return (
    <Box
      sx={{
        width: 180,
        minWidth: 180,
        maxWidth: 180,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E0E0E0',
        borderRadius: '8px',
        padding: '8px',
        height: '100%',
        overflowY: 'auto',
        // 비상정지 깜빡임 애니메이션 정의
        ...blinkKeyframes,
      }}
    >
      {/* 1. 작동프로그램 */}
      <StatusItem
        label="작동프로그램"
        value={String(currentProgram)}
        color={programColor}
      />

      {/* 2. 작동상태 */}
      <StatusItem
        label="작동상태"
        value={operationState.text}
        color={operationState.color}
        blink={operationState.blink}
      />

      {/* 3. 작동관수밸브 */}
      <StatusItem
        label="작동관수밸브"
        value={status?.active_valve ? String(status.active_valve).padStart(2, '0') : '00'}
        color={status?.active_valve ? '#27AE60' : '#212121'}
      />

      {/* 4. 양액공급밸브 */}
      <StatusItem
        label="양액공급밸브"
        value={nutrientValve.text}
        color={nutrientValve.color}
      />

      {/* 5. 원수공급펌프 */}
      <StatusItem
        label="원수공급펌프"
        value={drainPump.text}
        color={drainPump.color}
      />

      {/* 6. 관수공급펌프 */}
      <StatusItem
        label="관수공급펌프"
        value={irrigationPump.text}
        color={irrigationPump.color}
      />

      {/* 7. 양액교반기 */}
      <StatusItem
        label="양액교반기"
        value={mixerMotor.text}
        color={mixerMotor.color}
      />

      {/* 8. 1일관수유량 */}
      <StatusItem
        label="1일관수유량"
        value={`${status?.daily_total_supply?.toFixed(1) || '0.0'} L`}
      />

      {/* 9. 1일퇴수유량 */}
      <StatusItem
        label="1일퇴수유량"
        value={`${status?.daily_total_drain?.toFixed(1) || '0.0'} L`}
      />

      {/* 10. 현재일사량 */}
      <StatusItem
        label="현재일사량"
        value={`${sensors?.solarRadiation?.toFixed(0) || '0'} W/m²`}
      />

      {/* 11. 내부온도 */}
      <StatusItem
        label="내부온도"
        value={`${sensors?.indoorTemp?.toFixed(1) || '0.0'} °C`}
      />

      {/* 12. 원수온도 (outdoorTemp를 원수온도로 사용) */}
      <StatusItem
        label="원수온도"
        value={`${sensors?.outdoorTemp?.toFixed(1) || '0.0'} °C`}
      />
    </Box>
  );
};

export default StatusPanel;
