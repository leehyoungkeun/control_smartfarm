/**
 * MQTT 토픽 정의
 * 모든 농장 통신에 사용되는 토픽 패턴
 *
 * 통신 정책:
 * - AWS IoT (MQTT): 알람, FE 실시간 조회(온디맨드), 제어 명령만 사용
 * - HTTP 직접 전송: 센서 정기 저장(1분), 일일집계, 하트비트(겸용)
 * - 외부 FE는 AWS에 직접 연결하지 않음
 */

/**
 * 농장별 MQTT 토픽 생성
 * @param {string} farmId - 농장 AWS Thing 이름 (예: 'MyFarmPi_01')
 */
const topics = (farmId) => ({
  // RPi → 사무실 서버 (RPi가 발행, 서버가 구독) — AWS IoT 경유
  telemetry: `farm/${farmId}/telemetry`,       // 센서 데이터 (3초 간격, FE 실시간 조회 시에만)
  status: `farm/${farmId}/status`,             // 장비 상태 (FE 실시간 조회 시에만)
  alarm: `farm/${farmId}/alarm`,               // 경보 발생 (항상)
  commandAck: `farm/${farmId}/command/ack`,    // 명령 실행 결과

  // 사무실 서버 → RPi (서버가 발행, RPi가 구독) — AWS IoT 경유
  command: `farm/${farmId}/command`,           // 원격 제어 명령
  configUpdate: `farm/${farmId}/config/update`, // 설정 변경
  requestStart: `farm/${farmId}/request/start`, // 텔레메트리 발행 시작 요청
  requestStop: `farm/${farmId}/request/stop`,   // 텔레메트리 발행 중지 요청

  // HTTP 직접 전송으로 전환된 토픽 (MQTT 미사용)
  // dailySummary → POST /api/rpi-ingest/daily-summary
  // heartbeat    → POST /api/rpi-ingest (센서 전송이 하트비트 겸용)
});

/**
 * 서버가 구독할 와일드카드 토픽 패턴
 * 알람, FE 실시간 중계, 명령 응답만 구독 (비용 최소화)
 */
const serverSubscriptions = [
  'farm/+/telemetry',     // FE 실시간 조회용 (온디맨드)
  'farm/+/status',        // FE 실시간 조회용 (온디맨드)
  'farm/+/alarm',         // 경보 (항상)
  'farm/+/command/ack',   // 제어 명령 응답
];

/**
 * 토픽에서 farmId 추출
 * @param {string} topic - MQTT 토픽 (예: 'farm/MyFarmPi_01/telemetry')
 * @returns {string|null} farmId 또는 null
 */
const extractFarmId = (topic) => {
  const match = topic.match(/^farm\/([^/]+)\//);
  return match ? match[1] : null;
};

module.exports = { topics, serverSubscriptions, extractFarmId };
