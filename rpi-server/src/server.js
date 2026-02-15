/**
 * RPi 서버 진입점
 * HTTP 서버 시작, WebSocket, MQTT, 하트비트, 일일동기화 초기화
 */
require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initWsService } = require('./services/wsService');
const { initMqttService } = require('./services/mqttService');
const { startHeartbeat } = require('./services/heartbeatService');
const { startDailySync } = require('./services/dailySyncService');

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

async function start() {
  try {
    // 1. WebSocket 서비스 초기화 (터치패널용, 1초 간격)
    initWsService(server);
    console.log('✅ WebSocket 서비스 초기화 완료');

    // 2. MQTT 서비스 초기화 (AWS IoT Core 연결)
    try {
      await initMqttService();
      console.log('✅ MQTT 서비스 초기화 완료');
    } catch (mqttError) {
      console.warn('⚠️  MQTT 초기화 실패 (오프라인 모드):', mqttError.message);
    }

    // 3. 하트비트 서비스 시작 (60초마다)
    startHeartbeat();
    console.log('✅ 하트비트 서비스 시작');

    // 4. 일일 동기화 서비스 시작
    startDailySync();
    console.log('✅ 일일 동기화 서비스 시작');

    // 5. HTTP 서버 시작
    server.listen(PORT, () => {
      console.log(`🚀 RPi 서버 실행 중: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ RPi 서버 시작 실패:', error);
    process.exit(1);
  }
}

start();
