/**
 * 센서 HTTP 전송 서비스
 * 60초마다 최신 센서 데이터를 사무실 서버에 HTTP POST로 직접 전송
 * AWS IoT를 거치지 않아 비용 절감 + 하트비트 겸용 (last_online_at 자동 갱신)
 *
 * 전송 실패 시 로컬 큐에 저장했다가 다음 주기에 재전송 (최대 60건 보관)
 */
const sensorCache = require('./sensorCache');
const { SystemConfig } = require('../models');

const PUSH_INTERVAL_MS = 60 * 1000; // 60초
const MAX_RETRY_QUEUE = 60;          // 최대 60건 (1시간치) 보관
const REQUEST_TIMEOUT_MS = 10 * 1000; // HTTP 요청 타임아웃 10초

let intervalId = null;
let retryQueue = [];  // 전송 실패 시 재전송 대기 큐

// 환경변수에서 설정 읽기
const CLOUD_SERVER_URL = process.env.CLOUD_SERVER_URL;  // 예: https://smartfarm.mycompany.co.kr
const CLOUD_API_SECRET = process.env.CLOUD_API_SECRET;  // RPi 인증용 공유 시크릿
const FARM_ID = process.env.AWS_IOT_CLIENT_ID || 'MyFarmPi_01';

/**
 * 서비스 시작
 * 즉시 한 번 전송 후 60초 간격으로 반복
 */
function startSensorPush() {
  if (!CLOUD_SERVER_URL) {
    console.warn('⚠️  CLOUD_SERVER_URL 미설정 — 센서 HTTP 전송 서비스 비활성화');
    return;
  }

  intervalId = setInterval(pushSensorData, PUSH_INTERVAL_MS);
  // 서버 시작 후 10초 뒤 첫 전송 (farmId 해시 기반 분산 대신 고정 지연)
  setTimeout(pushSensorData, 10 * 1000);
  console.log(`센서 HTTP 전송 서비스 시작 (${PUSH_INTERVAL_MS / 1000}초 간격 → ${CLOUD_SERVER_URL})`);
}

/**
 * 서비스 중지
 */
function stopSensorPush() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('센서 HTTP 전송 서비스 중지');
  }
}

/**
 * 센서 데이터 전송 (메인 로직)
 * 1. 재시도 큐에 쌓인 것부터 전송
 * 2. 현재 센서 데이터 전송
 */
async function pushSensorData() {
  try {
    // 재시도 큐 먼저 처리
    if (retryQueue.length > 0) {
      await flushRetryQueue();
    }

    // 현재 센서 데이터 수집
    const sensors = sensorCache.getLatest();
    const config = SystemConfig.get();

    const payload = {
      farmId: FARM_ID,
      timestamp: Date.now(),
      sensors,
      status: {
        operatingState: config.operating_state,
        emergencyStop: config.emergency_stop,
        currentProgram: config.current_program,
        irrigationPump: config.irrigation_pump,
        rawWaterPump: config.raw_water_pump,
        mixerMotor: config.mixer_motor,
        currentValve: config.current_valve,
      },
      uptime: process.uptime(),
    };

    const success = await sendToCloud(payload);
    if (!success) {
      enqueueRetry(payload);
    }
  } catch (error) {
    console.error('센서 HTTP 전송 오류:', error.message);
  }
}

/**
 * Cloud 서버에 HTTP POST 전송
 * @param {object} payload - 전송할 데이터
 * @returns {boolean} 성공 여부
 */
async function sendToCloud(payload) {
  try {
    const url = `${CLOUD_SERVER_URL}/api/rpi-ingest`;
    const body = JSON.stringify(payload);

    // Node.js 내장 fetch 사용 (Node 18+)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Farm-Id': FARM_ID,
        'X-Api-Secret': CLOUD_API_SECRET || '',
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      return true;
    } else {
      console.warn(`센서 HTTP 전송 실패: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('센서 HTTP 전송 타임아웃 (10초)');
    } else {
      console.warn('센서 HTTP 전송 연결 실패:', error.message);
    }
    return false;
  }
}

/**
 * 전송 실패 데이터를 재시도 큐에 추가
 * 최대 MAX_RETRY_QUEUE건 (오래된 것부터 삭제)
 */
function enqueueRetry(payload) {
  retryQueue.push(payload);
  if (retryQueue.length > MAX_RETRY_QUEUE) {
    const dropped = retryQueue.shift(); // 가장 오래된 것 삭제
    console.warn(`재시도 큐 초과 — 가장 오래된 데이터 삭제 (${new Date(dropped.timestamp).toLocaleTimeString()})`);
  }
}

/**
 * 재시도 큐의 데이터를 일괄 전송
 * 한 번에 전체를 보내지 않고 배치 단위로 처리
 */
async function flushRetryQueue() {
  const batch = retryQueue.splice(0, retryQueue.length);
  const failed = [];

  for (const payload of batch) {
    const success = await sendToCloud(payload);
    if (!success) {
      failed.push(payload);
    }
  }

  // 전송 실패한 것은 다시 큐에 넣기
  if (failed.length > 0) {
    retryQueue = failed.concat(retryQueue).slice(0, MAX_RETRY_QUEUE);
    console.warn(`재시도 큐: ${failed.length}건 재전송 실패, ${retryQueue.length}건 대기 중`);
  } else if (batch.length > 0) {
    console.log(`재시도 큐: ${batch.length}건 재전송 완료`);
  }
}

module.exports = { startSensorPush, stopSensorPush };
