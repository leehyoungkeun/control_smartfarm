/**
 * 일일 동기화 서비스
 * 매일 00:05에 전일 일일 집계를 사무실 서버로 HTTP POST 직접 전송
 * (MQTT 경유 → HTTP 직접 전송으로 변경, AWS IoT 비용 절감)
 *
 * HTTP 전송 실패 시 최대 3회 재시도 (30초 간격)
 */
const { db, DailySummary, DailyValveFlow, SensorData, AlarmLog } = require('../models');

// 데이터 보관 기간 (일)
const SENSOR_RETENTION_DAYS = 30;  // 센서 데이터: 30일
const ALARM_RETENTION_DAYS = 90;   // 알람 로그: 90일

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 30 * 1000;  // 재시도 간격 30초
const REQUEST_TIMEOUT_MS = 15 * 1000; // HTTP 타임아웃 15초

let timeoutId = null;

// 환경변수에서 설정 읽기
const CLOUD_SERVER_URL = process.env.CLOUD_SERVER_URL;
const CLOUD_API_SECRET = process.env.CLOUD_API_SECRET;
const FARM_ID = process.env.AWS_IOT_CLIENT_ID || 'MyFarmPi_01';

/**
 * 일일 동기화 서비스 시작
 * 다음 00:05 시점에 동기화가 실행되도록 타이머 설정
 */
function startDailySync() {
  try {
    scheduleNextSync();
    console.log('일일 동기화 서비스 시작 (HTTP 직접 전송)');
  } catch (error) {
    console.error('일일 동기화 서비스 시작 오류:', error);
  }
}

/**
 * 일일 동기화 서비스 중지
 * 예약된 타이머를 해제
 */
function stopDailySync() {
  try {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      console.log('일일 동기화 서비스 중지');
    }
  } catch (error) {
    console.error('일일 동기화 서비스 중지 오류:', error);
  }
}

/**
 * 다음 00:05에 실행되도록 타이머 설정
 * 이미 오늘 00:05가 지났으면 내일로 예약
 */
function scheduleNextSync() {
  try {
    const now = new Date();
    const next = new Date(now);
    next.setHours(0, 5, 0, 0); // 00:05:00

    // 이미 오늘 00:05가 지났으면 내일로 설정
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    const delay = next.getTime() - now.getTime();
    console.log(`다음 일일 동기화: ${next.toLocaleString('ko-KR')} (${Math.round(delay / 60000)}분 후)`);

    timeoutId = setTimeout(async () => {
      try {
        await syncDailySummary();
      } catch (error) {
        console.error('일일 동기화 실행 오류:', error);
      }
      // 동기화 완료 후 다음 날 예약
      scheduleNextSync();
    }, delay);
  } catch (error) {
    console.error('일일 동기화 스케줄 설정 오류:', error);
  }
}

/**
 * 전일 일일 집계 동기화
 * HTTP POST로 사무실 서버에 직접 전송 (AWS IoT 미사용)
 */
async function syncDailySummary() {
  try {
    // 전일 날짜 계산
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const summaries = DailySummary.getByDate(dateStr);
    const valveFlows = DailyValveFlow.getByDate(dateStr);

    if (summaries.length === 0) {
      console.log(`일일 동기화: ${dateStr} 데이터 없음`);
      cleanupOldData();
      return;
    }

    // 일일 집계 데이터를 프로그램별로 정리
    const payload = {
      farmId: FARM_ID,
      date: dateStr,
      summaries: summaries.map(s => ({
        summaryDate: s.summary_date,
        programNumber: s.program_number,
        runCount: s.run_count,
        setEc: s.set_ec,
        setPh: s.set_ph,
        avgEc: s.avg_ec,
        avgPh: s.avg_ph,
        totalSupplyLiters: s.total_supply_liters,
        totalDrainLiters: s.total_drain_liters,
        valveFlows: valveFlows
          .filter(v => v.program_number === s.program_number)
          .map(v => ({
            valveNumber: v.valve_number,
            totalFlowLiters: v.total_flow_liters,
            runCount: v.run_count,
          })),
      })),
      timestamp: Date.now(),
    };

    // HTTP 전송 (재시도 포함)
    if (CLOUD_SERVER_URL) {
      const success = await sendWithRetry(payload);
      if (success) {
        console.log(`일일 동기화 완료 (HTTP): ${dateStr} (${summaries.length}개 프로그램)`);
      } else {
        console.error(`일일 동기화 실패 (HTTP): ${dateStr} — ${MAX_RETRIES}회 재시도 후 포기`);
      }
    } else {
      console.warn('CLOUD_SERVER_URL 미설정 — 일일 동기화 로컬만 저장');
    }

    // 오래된 데이터 자동 정리
    cleanupOldData();
  } catch (error) {
    console.error('일일 동기화 오류:', error);
  }
}

/**
 * HTTP POST로 사무실 서버에 전송 (최대 MAX_RETRIES회 재시도)
 * @param {object} payload - 전송할 데이터
 * @returns {boolean} 최종 성공 여부
 */
async function sendWithRetry(payload) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const url = `${CLOUD_SERVER_URL}/api/rpi-ingest/daily-summary`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Farm-Id': FARM_ID,
          'X-Api-Secret': CLOUD_API_SECRET || '',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        return true;
      }
      console.warn(`일일 동기화 전송 실패 (시도 ${attempt}/${MAX_RETRIES}): ${response.status}`);
    } catch (error) {
      const msg = error.name === 'AbortError' ? '타임아웃' : error.message;
      console.warn(`일일 동기화 전송 오류 (시도 ${attempt}/${MAX_RETRIES}): ${msg}`);
    }

    // 마지막 시도가 아니면 대기 후 재시도
    if (attempt < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  return false;
}

/**
 * 오래된 데이터 자동 정리
 * sensor_data: 30일, alarm_log: 90일 초과 데이터 삭제
 */
function cleanupOldData() {
  try {
    const sensorDeleted = SensorData.deleteOlderThan(SENSOR_RETENTION_DAYS);
    const alarmDeleted = AlarmLog.deleteOlderThan(ALARM_RETENTION_DAYS);

    if (sensorDeleted > 0 || alarmDeleted > 0) {
      console.log(`데이터 정리 완료: 센서 ${sensorDeleted}건, 알람 ${alarmDeleted}건 삭제`);
      // 삭제 후 디스크 공간 회수
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.exec('VACUUM');
      console.log('SQLite VACUUM 완료');
    }
  } catch (error) {
    console.error('데이터 정리 오류:', error);
  }
}

module.exports = { startDailySync, stopDailySync };
