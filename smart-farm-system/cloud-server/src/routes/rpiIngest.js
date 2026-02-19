/**
 * RPi 센서 데이터 수신 라우트
 * RPi가 60초마다 HTTP POST로 직접 전송하는 센서 데이터를 수신
 * AWS IoT를 거치지 않는 직접 통신 경로
 *
 * - 센서 스냅샷 DB 저장
 * - Farm.last_online_at 갱신 (하트비트 겸용)
 * - 일일집계 데이터 수신 처리
 */
const router = require('express').Router();
const { Farm, DailySummaryArchive } = require('../models');

// RPi 인증용 공유 시크릿 (환경변수)
const API_SECRET = process.env.RPI_API_SECRET;

/**
 * RPi 인증 미들웨어
 * X-Api-Secret 헤더와 X-Farm-Id 헤더를 검증
 */
function authenticateRpi(req, res, next) {
  const farmId = req.headers['x-farm-id'];
  const secret = req.headers['x-api-secret'];

  if (!farmId) {
    return res.status(400).json({ success: false, message: 'X-Farm-Id 헤더 누락' });
  }

  // API_SECRET이 설정된 경우에만 검증 (개발 시 미설정 허용)
  if (API_SECRET && secret !== API_SECRET) {
    return res.status(401).json({ success: false, message: '인증 실패' });
  }

  req.farmThingName = farmId;
  next();
}

/**
 * POST /api/rpi-ingest
 * RPi에서 60초마다 전송하는 센서 + 상태 데이터 수신
 *
 * 요청 본문:
 * {
 *   farmId: "MyFarmPi_01",
 *   timestamp: 1234567890,
 *   sensors: { ec, ph, outdoor_temp, ... },
 *   status: { operatingState, emergencyStop, ... },
 *   uptime: 12345
 * }
 */
router.post('/', authenticateRpi, async (req, res) => {
  try {
    const { farmId, timestamp, sensors, status, uptime } = req.body;

    // 농장 조회 (aws_thing_name으로)
    const farm = await Farm.findOne({ where: { aws_thing_name: req.farmThingName } });
    if (!farm) {
      return res.status(404).json({ success: false, message: '등록되지 않은 농장' });
    }

    // 하트비트 겸용: last_online_at 갱신 + 센서 스냅샷 저장 (1회 쿼리)
    await Farm.update(
      {
        last_online_at: new Date(),
        latest_sensor_data: {
          sensors,
          status,
          uptime,
          received_at: new Date().toISOString(),
          rpi_timestamp: timestamp,
        },
      },
      { where: { id: farm.id } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('RPi 센서 수신 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

/**
 * POST /api/rpi-ingest/daily-summary
 * RPi에서 매일 00:05에 전송하는 일일집계 데이터
 *
 * 요청 본문:
 * {
 *   farmId: "MyFarmPi_01",
 *   date: "2026-02-18",
 *   summaries: [...],
 *   timestamp: 1234567890
 * }
 */
router.post('/daily-summary', authenticateRpi, async (req, res) => {
  try {
    const { date, summaries } = req.body;

    const farm = await Farm.findOne({ where: { aws_thing_name: req.farmThingName } });
    if (!farm) {
      return res.status(404).json({ success: false, message: '등록되지 않은 농장' });
    }

    // 일일집계 저장 (upsert로 중복 방지)
    if (Array.isArray(summaries)) {
      for (const s of summaries) {
        await DailySummaryArchive.upsert({
          farm_id: farm.id,
          summary_date: s.summaryDate,
          program_number: s.programNumber,
          run_count: s.runCount,
          set_ec: s.setEc,
          set_ph: s.setPh,
          avg_ec: s.avgEc,
          avg_ph: s.avgPh,
          total_supply_liters: s.totalSupplyLiters,
          total_drain_liters: s.totalDrainLiters,
          valve_flows: s.valveFlows,
        });
      }
    }

    // last_online_at도 갱신
    await Farm.update(
      { last_online_at: new Date() },
      { where: { id: farm.id } }
    );

    console.log(`일일집계 HTTP 수신: ${farm.name || req.farmThingName} (${date}, ${summaries?.length || 0}개 프로그램)`);
    res.json({ success: true });
  } catch (error) {
    console.error('일일집계 HTTP 수신 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;
