/**
 * 프론트엔드 상수 정의
 */

// 연결 모드
export const CONNECTION_MODE = {
  LOCAL: 'local',   // 터치패널 → RPi 직접
  CLOUD: 'cloud',   // 외부 → 사무실 서버
};

// API URL (환경변수에서)
export const CLOUD_API_URL = import.meta.env.VITE_CLOUD_API_URL || 'http://localhost:3000';
export const LOCAL_API_URL = import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:3001';
export const CLOUD_WS_URL = import.meta.env.VITE_CLOUD_WS_URL || 'ws://localhost:3000/ws/farm';
export const LOCAL_WS_URL = import.meta.env.VITE_LOCAL_WS_URL || 'ws://localhost:3001/ws/status';

// 밸브/프로그램/탱크
export const VALVE_COUNT = 14;
export const PROGRAM_COUNT = 6;
export const TANK_COUNT = 7;

// 역할 라벨
export const ROLE_LABELS = {
  superadmin: '최고관리자',
  admin: '관리자',
  operator: '운영자',
  viewer: '뷰어',
};

// 경보 유형 라벨
export const ALARM_TYPE_LABELS = {
  EC_HIGH: 'EC 상한 초과',
  EC_LOW: 'EC 하한 미달',
  PH_HIGH: 'pH 상한 초과',
  PH_LOW: 'pH 하한 미달',
  TEMP_HIGH: '온도 상한 초과',
  TEMP_LOW: '온도 하한 미달',
  FLOW_ERROR: '유량 이상',
  EMERGENCY_STOP: '긴급 정지',
  OFFLINE: '오프라인',
};

// 운전 상태 라벨/색상
export const OPERATING_STATE_LABELS = {
  RUNNING: '운전 중',
  STOPPED: '정지',
  EMERGENCY: '긴급 정지',
  PAUSED: '일시 정지',
};

export const OPERATING_STATE_COLORS = {
  RUNNING: '#27AE60',
  STOPPED: '#95A5A6',
  EMERGENCY: '#E74C3C',
  PAUSED: '#F39C12',
};

// 농장 상태 라벨
export const FARM_STATUS_LABELS = {
  active: '운영 중',
  inactive: '비활성',
  maintenance: '점검 중',
};

export const FARM_STATUS_COLORS = {
  active: '#27AE60',
  inactive: '#95A5A6',
  maintenance: '#F39C12',
};
