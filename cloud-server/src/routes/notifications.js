/**
 * 알림 설정 라우터
 * 사용자별 농장 알림 수신 설정 관리
 * 모든 라우트에 authenticate 미들웨어 필요
 */
const router = require('express').Router({ mergeParams: true });
const { NotificationSetting, Farm } = require('../models');

/**
 * GET /settings
 * 내 알림 설정 목록 조회
 * 현재 로그인한 사용자의 모든 농장별 알림 설정 반환
 * 농장 이름 포함
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await NotificationSetting.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Farm,
          attributes: ['name'],
        },
      ],
    });

    return res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('알림 설정 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '알림 설정을 조회하는 중 오류가 발생했습니다.',
    });
  }
});

/**
 * PUT /settings/:farmId
 * 특정 농장의 알림 설정 수정 (없으면 생성)
 * Body: { alarm_types, channels, quiet_hours_start, quiet_hours_end, is_active }
 * user_id + farm_id 조합으로 Upsert 처리
 */
router.put('/settings/:farmId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { farmId } = req.params;
    const {
      alarm_types,
      channels,
      quiet_hours_start,
      quiet_hours_end,
      is_active,
    } = req.body;

    // 기존 설정 조회 또는 새로 생성
    const [setting, created] = await NotificationSetting.findOrCreate({
      where: {
        user_id: userId,
        farm_id: farmId,
      },
      defaults: {
        alarm_types,
        channels,
        quiet_hours_start,
        quiet_hours_end,
        is_active,
      },
    });

    // 기존 설정이 이미 있으면 업데이트
    if (!created) {
      if (alarm_types !== undefined) setting.alarm_types = alarm_types;
      if (channels !== undefined) setting.channels = channels;
      if (quiet_hours_start !== undefined) setting.quiet_hours_start = quiet_hours_start;
      if (quiet_hours_end !== undefined) setting.quiet_hours_end = quiet_hours_end;
      if (is_active !== undefined) setting.is_active = is_active;
      await setting.save();
    }

    return res.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    console.error('알림 설정 수정 실패:', error);
    return res.status(500).json({
      success: false,
      message: '알림 설정을 수정하는 중 오류가 발생했습니다.',
    });
  }
});

module.exports = router;
