/**
 * 농장 프로그램 라우터
 * 관수 프로그램 조회 및 수정
 * 실제 프로그램은 RPi SQLite에 저장되며, MVP에서는 config_json.programs 사용
 * 추후 MQTT 요청/응답 패턴으로 RPi와 직접 통신
 */
const router = require('express').Router({ mergeParams: true });
const { Farm, ControlLog } = require('../models');
const { sendCommand } = require('../services/mqttBridgeService');

/**
 * GET /
 * 프로그램 목록 조회
 * config_json.programs 배열 반환 (없으면 빈 배열)
 * 향후 MQTT를 통해 RPi에서 직접 프로그램 데이터를 받아오는 구조로 변경 예정
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

    // MVP: config_json에서 programs 배열 반환
    const programs = (farm.config_json && farm.config_json.programs) || [];

    return res.json({
      success: true,
      data: programs,
    });
  } catch (error) {
    console.error('프로그램 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '프로그램을 조회하는 중 오류가 발생했습니다.',
    });
  }
});

/**
 * PUT /:programId
 * 프로그램 수정
 * 제어 권한(control) 필요
 * MQTT를 통해 RPi에 프로그램 수정 명령을 전달
 * 실제 업데이트는 RPi에서 처리됨
 */
router.put('/:programId', async (req, res) => {
  try {
    // 제어 권한 확인
    if (req.farmPermission !== 'control') {
      return res.status(403).json({
        success: false,
        message: '프로그램을 수정하려면 제어 권한이 필요합니다.',
      });
    }

    const farm = await Farm.findByPk(req.params.id);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: '농장을 찾을 수 없습니다.',
      });
    }

    const { programId } = req.params;

    // MQTT를 통해 RPi에 프로그램 수정 명령 전송
    await sendCommand(farm.aws_thing_name, {
      type: 'UPDATE_PROGRAM',
      programId,
      data: req.body,
    });

    // 제어 로그 기록
    await ControlLog.create({
      farm_id: req.params.id,
      user_id: req.user.id,
      command_type: 'UPDATE_PROGRAM',
      command_detail: { programId, ...req.body },
      source: 'web_remote',
    });

    return res.json({
      success: true,
      message: '프로그램 수정 명령이 전송되었습니다. 실제 업데이트는 RPi에서 처리됩니다.',
    });
  } catch (error) {
    console.error('프로그램 수정 실패:', error);
    return res.status(500).json({
      success: false,
      message: '프로그램을 수정하는 중 오류가 발생했습니다.',
    });
  }
});

module.exports = router;
