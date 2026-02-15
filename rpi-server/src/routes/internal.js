/**
 * 내부 API 라우트 (Node-RED용)
 * localhost에서만 접근 가능 (localOnly 미들웨어 적용)
 * 센서 데이터 수신, 상태 업데이트, 경보 등록, 설정/프로그램 조회
 */
const router = require('express').Router();
const { SensorData, SystemConfig, AlarmLog, IrrigationProgram, ValveConfig } = require('../models');
const sensorCache = require('../services/sensorCache');
const alarmService = require('../services/alarmService');

/**
 * POST /internal/sensor-update
 * Node-RED에서 수집된 센서 데이터 수신 및 저장
 */
router.post('/sensor-update', (req, res) => {
  try {
    const sensorData = req.body;

    // 센서 데이터 DB에 저장
    SensorData.insert(sensorData);

    // 센서 캐시 업데이트 (WebSocket 실시간 전송용)
    sensorCache.update(sensorData);

    // 시스템 설정에 현재 센서 값 반영
    SystemConfig.update({
      current_ec: sensorData.ec,
      current_ph: sensorData.ph,
      outdoor_temp: sensorData.outdoor_temp,
      indoor_temp: sensorData.indoor_temp,
      substrate_temp: sensorData.substrate_temp,
      solar_radiation: sensorData.solar_radiation,
      supply_flow: sensorData.supply_flow,
      drain_flow: sensorData.drain_flow,
      co2_level: sensorData.co2_level
    });

    // 경보 임계값 확인
    alarmService.checkThresholds(sensorData);

    res.json({ success: true });
  } catch (error) {
    console.error('센서 데이터 수신 중 오류:', error);
    res.status(500).json({ success: false, message: '센서 데이터 수신 중 오류가 발생했습니다.' });
  }
});

/**
 * POST /internal/status-update
 * Node-RED에서 시스템 상태 업데이트 수신
 */
router.post('/status-update', (req, res) => {
  try {
    const data = req.body;
    // Node-RED 필드명을 DB 컬럼명으로 매핑
    const updateFields = {};
    if (data.operating_state !== undefined) updateFields.operating_state = data.operating_state;
    if (data.active_program !== undefined) updateFields.current_program = data.active_program;
    if (data.emergency_stop !== undefined) updateFields.emergency_stop = data.emergency_stop;
    // pump_state 객체를 개별 컬럼으로 분리
    if (data.pump_state) {
      updateFields.irrigation_pump = data.pump_state.nutrient_pump ? 1 : 0;
      updateFields.drain_pump = data.pump_state.raw_pump ? 1 : 0;
    }
    if (data.mixer_state !== undefined) updateFields.mixer_motor = data.mixer_state ? 1 : 0;

    if (Object.keys(updateFields).length > 0) {
      SystemConfig.update(updateFields);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('상태 업데이트 수신 중 오류:', error);
    res.status(500).json({ success: false, message: '상태 업데이트 수신 중 오류가 발생했습니다.' });
  }
});

/**
 * POST /internal/alarm
 * Node-RED에서 경보 등록
 */
router.post('/alarm', (req, res) => {
  try {
    const { alarm_type, alarm_value, threshold_value, message } = req.body;

    // 경보 데이터 DB에 저장
    AlarmLog.insert({ alarm_type, alarm_value, threshold_value, message });

    res.json({ success: true });
  } catch (error) {
    console.error('경보 등록 중 오류:', error);
    res.status(500).json({ success: false, message: '경보 등록 중 오류가 발생했습니다.' });
  }
});

/**
 * GET /internal/programs
 * 전체 관수 프로그램 목록 조회 (밸브 설정 포함)
 */
router.get('/programs', (req, res) => {
  try {
    const programs = IrrigationProgram.getAll();

    // 각 프로그램에 밸브 설정 첨부
    const programsWithValves = programs.map(program => ({
      ...program,
      valves: ValveConfig.getByProgram(program.id)
    }));

    res.json({ success: true, data: programsWithValves });
  } catch (error) {
    console.error('프로그램 목록 조회 중 오류:', error);
    res.status(500).json({ success: false, message: '프로그램 목록 조회 중 오류가 발생했습니다.' });
  }
});

/**
 * GET /internal/config
 * 시스템 설정 조회
 */
router.get('/config', (req, res) => {
  try {
    const config = SystemConfig.get();
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('시스템 설정 조회 중 오류:', error);
    res.status(500).json({ success: false, message: '시스템 설정 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
