/**
 * 시스템 상수 정의
 */
module.exports = {
  // 하드웨어 구성 상수
  VALVE_COUNT: 14,       // 밸브 개수
  PROGRAM_COUNT: 6,      // 프로그램 개수
  TANK_COUNT: 7,         // 탱크 개수

  // 사용자 역할
  ROLES: {
    SUPERADMIN: 'superadmin',  // 슈퍼관리자
    ADMIN: 'admin',            // 관리자
    OPERATOR: 'operator',      // 운영자
    VIEWER: 'viewer',          // 열람자
  },

  // 농장 접근 권한
  PERMISSIONS: {
    CONTROL: 'control',  // 제어 권한
    VIEW: 'view',        // 열람 권한
  },

  // 경보 유형
  ALARM_TYPES: [
    'EC_HIGH',          // EC 상한 초과
    'EC_LOW',           // EC 하한 미달
    'PH_HIGH',          // pH 상한 초과
    'PH_LOW',           // pH 하한 미달
    'TEMP_HIGH',        // 온도 상한 초과
    'TEMP_LOW',         // 온도 하한 미달
    'FLOW_ERROR',       // 유량 오류
    'EMERGENCY_STOP',   // 비상 정지
    'OFFLINE',          // 오프라인
  ],

  // 제어 명령 출처
  COMMAND_SOURCES: [
    'touchpanel',       // 터치패널
    'web_remote',       // 웹 원격
    'auto_schedule',    // 자동 스케줄
    'auto_alarm',       // 자동 경보
  ],

  // 농장 상태
  FARM_STATUS: {
    ACTIVE: 'active',             // 활성
    INACTIVE: 'inactive',         // 비활성
    MAINTENANCE: 'maintenance',   // 유지보수
  },

  // JWT 토큰 만료 시간
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
};
