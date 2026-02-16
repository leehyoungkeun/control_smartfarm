/**
 * 시스템 설정 라우트
 * 시스템 설정 조회 및 업데이트
 */
const router = require('express').Router();
const { SystemConfig } = require('../models');

// 사용자가 업데이트 가능한 필드 화이트리스트
const UPDATABLE_FIELDS = new Set([
  // 목표값
  'set_ec', 'set_ph',
  // 경보 임계값
  'alarm_ec_upper', 'alarm_ec_lower', 'alarm_ph_upper', 'alarm_ph_lower',
  'alarm_temp_upper', 'alarm_temp_lower',
  // 경보 작동 하한
  'operation_ec_lower', 'operation_ph_lower',
  // 양액제어 설정
  'scenario_count', 'auto_supply',
  'bulk_ec_threshold', 'bulk_ph_threshold',
  'deadband_ec', 'deadband_ph',
  // 하드웨어 설정
  'tank_count', 'valve_count', 'tank_config',
  // 설비/시스템 설정
  'acid_type', 'flow_unit', 'min_solar_radiation',
  'agitator_on_time', 'agitator_off_time',
  'raw_water_temp_setting', 'outdoor_temp_setting',
]);

/**
 * GET /api/config
 * 시스템 설정 조회
 */
router.get('/', (req, res) => {
  try {
    const config = SystemConfig.get();
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('시스템 설정 조회 중 오류:', error);
    res.status(500).json({ success: false, message: '시스템 설정 조회 중 오류가 발생했습니다.' });
  }
});

/**
 * PUT /api/config
 * 시스템 설정 업데이트 (화이트리스트 필드만 허용)
 */
router.put('/', (req, res) => {
  try {
    // 허용된 필드만 필터링
    const filtered = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (UPDATABLE_FIELDS.has(key)) {
        filtered[key] = value;
      }
    }

    if (Object.keys(filtered).length === 0) {
      return res.status(400).json({ success: false, message: '업데이트할 유효한 필드가 없습니다.' });
    }

    SystemConfig.update(filtered);
    const updatedConfig = SystemConfig.get();
    res.json({ success: true, message: '시스템 설정이 업데이트되었습니다.', data: updatedConfig });
  } catch (error) {
    console.error('시스템 설정 업데이트 중 오류:', error);
    res.status(500).json({ success: false, message: '시스템 설정 업데이트 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
