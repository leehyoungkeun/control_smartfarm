/**
 * 농장 설정 라우터
 * 농장 config_json 조회 및 변경, MQTT를 통한 설정 전파
 */
const router = require('express').Router({ mergeParams: true });
const { Farm, ControlLog } = require('../models');
const { sendConfigUpdate } = require('../services/mqttBridgeService');

/**
 * GET /
 * 농장 설정 조회
 * config_json이 null이면 빈 객체 반환
 */
router.get('/', async (req, res) => {
  try {
    const farm = await Farm.findByPk(req.params.id);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: '농장을 찾을 수 없습니다.',
      });
    }

    return res.json({
      success: true,
      data: farm.config_json || {},
    });
  } catch (error) {
    console.error('농장 설정 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '농장 설정을 조회하는 중 오류가 발생했습니다.',
    });
  }
});

/**
 * PUT /
 * 농장 설정 변경
 * 제어 권한(control) 필요
 * 설정 변경 후 MQTT로 RPi에 전파하고 제어 로그 기록
 */
router.put('/', async (req, res) => {
  try {
    // 제어 권한 확인
    if (req.farmPermission !== 'control') {
      return res.status(403).json({
        success: false,
        message: '설정을 변경하려면 제어 권한이 필요합니다.',
      });
    }

    const farm = await Farm.findByPk(req.params.id);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: '농장을 찾을 수 없습니다.',
      });
    }

    // config_json 업데이트
    farm.config_json = req.body;
    await farm.save();

    // 제어 로그 기록
    await ControlLog.create({
      farm_id: req.params.id,
      user_id: req.user.id,
      command_type: 'CONFIG_UPDATE',
      command_detail: req.body,
      source: 'web_remote',
    });

    // MQTT를 통해 RPi에 설정 전파
    await sendConfigUpdate(farm.aws_thing_name, req.body);

    return res.json({
      success: true,
      data: farm.config_json,
    });
  } catch (error) {
    console.error('농장 설정 변경 실패:', error);
    return res.status(500).json({
      success: false,
      message: '농장 설정을 변경하는 중 오류가 발생했습니다.',
    });
  }
});

module.exports = router;
