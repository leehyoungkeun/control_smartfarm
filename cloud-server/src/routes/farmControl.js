/**
 * 농장 제어 라우터
 * 긴급 정지, 운전 시작/정지, 수동 제어 명령 전송
 * 모든 제어 명령은 MQTT를 통해 RPi로 전달되며 제어 로그에 기록됨
 */
const router = require('express').Router({ mergeParams: true });
const { Farm, ControlLog } = require('../models');
const { sendCommand } = require('../services/mqttBridgeService');

/**
 * 제어 권한 확인 헬퍼
 * farmPermission이 'control'이 아니면 403 반환
 */
const requireFarmControl = (req, res) => {
  if (req.farmPermission !== 'control') {
    res.status(403).json({
      success: false,
      message: '제어 권한이 필요합니다.',
    });
    return false;
  }
  return true;
};

/**
 * POST /emergency-stop
 * 긴급 정지 명령
 * 제어 권한(control) 필요
 * 즉시 RPi에 긴급 정지 명령을 전송하고 로그 기록
 */
router.post('/emergency-stop', async (req, res) => {
  try {
    // 제어 권한 확인
    if (!requireFarmControl(req, res)) return;

    const farm = await Farm.findByPk(req.params.id);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: '농장을 찾을 수 없습니다.',
      });
    }

    // MQTT를 통해 긴급 정지 명령 전송
    await sendCommand(farm.aws_thing_name, { type: 'EMERGENCY_STOP' });

    // 제어 로그 기록
    await ControlLog.create({
      farm_id: req.params.id,
      user_id: req.user.id,
      command_type: 'EMERGENCY_STOP',
      source: 'web_remote',
    });

    return res.json({
      success: true,
      message: '긴급 정지 명령이 전송되었습니다.',
    });
  } catch (error) {
    console.error('긴급 정지 실패:', error);
    return res.status(500).json({
      success: false,
      message: '긴급 정지 명령을 전송하는 중 오류가 발생했습니다.',
    });
  }
});

/**
 * POST /start
 * 운전 시작 명령
 * 제어 권한(control) 필요
 */
router.post('/start', async (req, res) => {
  try {
    // 제어 권한 확인
    if (!requireFarmControl(req, res)) return;

    const farm = await Farm.findByPk(req.params.id);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: '농장을 찾을 수 없습니다.',
      });
    }

    // MQTT를 통해 운전 시작 명령 전송
    await sendCommand(farm.aws_thing_name, { type: 'START' });

    // 제어 로그 기록
    await ControlLog.create({
      farm_id: req.params.id,
      user_id: req.user.id,
      command_type: 'START',
      source: 'web_remote',
    });

    return res.json({
      success: true,
      message: '운전 시작 명령이 전송되었습니다.',
    });
  } catch (error) {
    console.error('운전 시작 실패:', error);
    return res.status(500).json({
      success: false,
      message: '운전 시작 명령을 전송하는 중 오류가 발생했습니다.',
    });
  }
});

/**
 * POST /stop
 * 운전 정지 명령
 * 제어 권한(control) 필요
 */
router.post('/stop', async (req, res) => {
  try {
    // 제어 권한 확인
    if (!requireFarmControl(req, res)) return;

    const farm = await Farm.findByPk(req.params.id);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: '농장을 찾을 수 없습니다.',
      });
    }

    // MQTT를 통해 운전 정지 명령 전송
    await sendCommand(farm.aws_thing_name, { type: 'STOP' });

    // 제어 로그 기록
    await ControlLog.create({
      farm_id: req.params.id,
      user_id: req.user.id,
      command_type: 'STOP',
      source: 'web_remote',
    });

    return res.json({
      success: true,
      message: '운전 정지 명령이 전송되었습니다.',
    });
  } catch (error) {
    console.error('운전 정지 실패:', error);
    return res.status(500).json({
      success: false,
      message: '운전 정지 명령을 전송하는 중 오류가 발생했습니다.',
    });
  }
});

/**
 * POST /manual
 * 수동 제어 명령
 * 제어 권한(control) 필요
 * Body: { action, valveNumber, ... }
 */
router.post('/manual', async (req, res) => {
  try {
    // 제어 권한 확인
    if (!requireFarmControl(req, res)) return;

    const farm = await Farm.findByPk(req.params.id);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: '농장을 찾을 수 없습니다.',
      });
    }

    // MQTT를 통해 수동 제어 명령 전송
    await sendCommand(farm.aws_thing_name, {
      type: 'MANUAL',
      ...req.body,
    });

    // 제어 로그 기록
    await ControlLog.create({
      farm_id: req.params.id,
      user_id: req.user.id,
      command_type: 'MANUAL',
      command_detail: req.body,
      source: 'web_remote',
    });

    return res.json({
      success: true,
      message: '수동 제어 명령이 전송되었습니다.',
    });
  } catch (error) {
    console.error('수동 제어 실패:', error);
    return res.status(500).json({
      success: false,
      message: '수동 제어 명령을 전송하는 중 오류가 발생했습니다.',
    });
  }
});

module.exports = router;
