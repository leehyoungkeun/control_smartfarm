/**
 * 서버 진입점
 * HTTP 서버 시작, WebSocket, MQTT 브릿지, 오프라인 모니터 초기화
 */
require('dotenv').config();
const http = require('http');
const app = require('./app');
const { sequelize } = require('./models');
const { initFarmWsService } = require('./services/farmWsService');
const { initMqttBridge } = require('./services/mqttBridgeService');
const { startOfflineMonitor } = require('./services/offlineMonitor');

// JWT_SECRET 필수 검증
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_jwt_secret_change_this') {
  console.error('❌ JWT_SECRET 환경변수가 설정되지 않았거나 기본값입니다. .env 파일을 확인하세요.');
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

/**
 * 서버 시작 함수
 * DB 연결 확인 → WebSocket 초기화 → MQTT 브릿지 → 오프라인 모니터 → HTTP 서버
 */
async function start() {
  try {
    // 1. DB 연결 확인
    await sequelize.authenticate();
    console.log('✅ PostgreSQL 연결 성공');

    // 2. WebSocket 서비스 초기화 (외부 FE 실시간 데이터 중계)
    initFarmWsService(server);
    console.log('✅ WebSocket 서비스 초기화 완료');

    // 3. MQTT 브릿지 서비스 초기화 (AWS IoT Core 연결)
    try {
      await initMqttBridge();
      console.log('✅ MQTT 브릿지 서비스 초기화 완료');
    } catch (mqttError) {
      // 인증서 없이도 서버를 계속 실행하기 위해 경고만 출력
      console.warn('⚠️  MQTT 브릿지 초기화 실패 (인증서 없이 계속 실행):', mqttError.message);
    }

    // 3-1. 경보 이메일 알림 서비스 등록 (MQTT 연결과 무관하게 등록)
    require('./services/alarmNotifier');
    console.log('✅ 경보 알림 서비스 등록 완료');

    // 4. 오프라인 모니터 시작
    startOfflineMonitor();
    console.log('✅ 오프라인 모니터 시작');

    // 5. HTTP 서버 시작
    server.listen(PORT, () => {
      console.log(`🚀 사무실 서버 실행 중: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

start();
