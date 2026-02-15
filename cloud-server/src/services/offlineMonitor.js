/**
 * 오프라인 모니터 서비스
 * 1분마다 농장의 last_online_at을 확인하여 오프라인 경보 생성
 * 다시 온라인이 된 농장은 자동으로 경보 해결 처리
 */
const { Op } = require('sequelize');
const { Farm, AlarmHistory } = require('../models');

// 5분 이상 하트비트 없으면 오프라인으로 판단
const OFFLINE_THRESHOLD_MINUTES = 5;
// 1분마다 확인
const CHECK_INTERVAL_MS = 60 * 1000;

// 이미 오프라인 경보를 발생시킨 농장 추적 (중복 경보 방지)
const notifiedFarms = new Set();

// 주기적 검사 인터벌 ID
let intervalId = null;

/**
 * 오프라인 모니터 시작
 * 설정된 간격으로 농장 온라인 상태를 주기적으로 검사
 */
function startOfflineMonitor() {
  try {
    intervalId = setInterval(checkOfflineFarms, CHECK_INTERVAL_MS);
    console.log(`오프라인 모니터 시작 (${OFFLINE_THRESHOLD_MINUTES}분 임계값, ${CHECK_INTERVAL_MS / 1000}초 간격)`);
  } catch (error) {
    console.error('오프라인 모니터 시작 오류:', error);
  }
}

/**
 * 오프라인 모니터 중지
 * 주기적 검사 인터벌 정리
 */
function stopOfflineMonitor() {
  try {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      console.log('오프라인 모니터 중지됨');
    }
  } catch (error) {
    console.error('오프라인 모니터 중지 오류:', error);
  }
}

/**
 * 오프라인 농장 검사
 * 임계값 이상 하트비트가 없는 농장을 찾아 경보 생성
 * 다시 온라인이 된 농장은 경보 자동 해결
 */
async function checkOfflineFarms() {
  try {
    // 오프라인 판단 기준 시각 계산
    const threshold = new Date(Date.now() - OFFLINE_THRESHOLD_MINUTES * 60 * 1000);

    // 오프라인 상태인 활성 농장 조회 (하트비트 없거나 임계값 초과)
    const offlineFarms = await Farm.findAll({
      where: {
        status: 'active',
        [Op.or]: [
          { last_online_at: { [Op.lt]: threshold } },
          { last_online_at: null },
        ],
      },
    });

    for (const farm of offlineFarms) {
      // 이미 알림을 보낸 농장이면 건너뛰기
      if (notifiedFarms.has(farm.id)) continue;

      try {
        // 미해결 OFFLINE 경보가 이미 있는지 확인
        const existingAlarm = await AlarmHistory.findOne({
          where: {
            farm_id: farm.id,
            alarm_type: 'OFFLINE',
            resolved_at: null,
          },
        });

        // 기존 경보가 없으면 새로 생성
        if (!existingAlarm) {
          await AlarmHistory.create({
            farm_id: farm.id,
            alarm_type: 'OFFLINE',
            message: `농장 "${farm.name}"이(가) ${OFFLINE_THRESHOLD_MINUTES}분 이상 응답 없음`,
          });
          console.log(`오프라인 경보: ${farm.name} (${farm.aws_thing_name})`);
        }

        // 알림 발송 완료 추적에 추가
        notifiedFarms.add(farm.id);
      } catch (farmError) {
        console.error(`오프라인 경보 생성 오류 (농장: ${farm.name}):`, farmError);
      }
    }

    // 다시 온라인이 된 농장 확인 및 경보 해결 처리
    const onlineFarms = await Farm.findAll({
      where: {
        status: 'active',
        last_online_at: { [Op.gte]: threshold },
      },
    });

    for (const farm of onlineFarms) {
      if (notifiedFarms.has(farm.id)) {
        try {
          // 추적에서 제거
          notifiedFarms.delete(farm.id);

          // 미해결 OFFLINE 경보 자동 해결 처리
          await AlarmHistory.update(
            { resolved_at: new Date() },
            { where: { farm_id: farm.id, alarm_type: 'OFFLINE', resolved_at: null } }
          );
          console.log(`온라인 복귀: ${farm.name}`);
        } catch (resolveError) {
          console.error(`경보 해결 처리 오류 (농장: ${farm.name}):`, resolveError);
        }
      }
    }
  } catch (error) {
    console.error('오프라인 모니터 오류:', error);
  }
}

module.exports = { startOfflineMonitor, stopOfflineMonitor };
