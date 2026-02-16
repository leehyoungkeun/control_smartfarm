/**
 * 농장 경보 이력 라우터
 * 경보 조회, 미해결 경보 조회, 경보 해결 처리
 */
const router = require('express').Router({ mergeParams: true });
const { Op } = require('sequelize');
const { AlarmHistory } = require('../models');

/**
 * GET /
 * 경보 이력 조회 (페이지네이션)
 * - page: 페이지 번호 (기본값 1)
 * - limit: 페이지당 항목 수 (기본값 20)
 * - type: 경보 유형 필터
 * - from: 시작 일시 필터
 * - to: 종료 일시 필터
 */
router.get('/', async (req, res) => {
  try {
    const farmId = req.params.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const { type, from, to } = req.query;

    // 기본 조건: 해당 농장의 경보
    const where = { farm_id: farmId };

    // 경보 유형 필터
    if (type) {
      where.alarm_type = type;
    }

    // 발생 일시 범위 필터
    if (from || to) {
      where.occurred_at = {};
      if (from) {
        where.occurred_at[Op.gte] = new Date(from);
      }
      if (to) {
        where.occurred_at[Op.lte] = new Date(to);
      }
    }

    const { count: total, rows: alarms } = await AlarmHistory.findAndCountAll({
      where,
      order: [['occurred_at', 'DESC']],
      limit,
      offset,
    });

    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      data: {
        alarms,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error('경보 이력 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '경보 이력을 조회하는 중 오류가 발생했습니다.',
    });
  }
});

/**
 * GET /active
 * 미해결(활성) 경보 조회
 * resolved_at이 NULL인 경보만 반환
 */
router.get('/active', async (req, res) => {
  try {
    const farmId = req.params.id;

    const alarms = await AlarmHistory.findAll({
      where: {
        farm_id: farmId,
        resolved_at: { [Op.is]: null },
      },
      order: [['occurred_at', 'DESC']],
    });

    return res.json({
      success: true,
      data: alarms,
    });
  } catch (error) {
    console.error('미해결 경보 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '미해결 경보를 조회하는 중 오류가 발생했습니다.',
    });
  }
});

/**
 * PUT /:alarmId/resolve
 * 경보 해결 처리
 * 제어 권한(control)이 필요
 */
router.put('/:alarmId/resolve', async (req, res) => {
  try {
    // 제어 권한 확인
    if (req.farmPermission !== 'control') {
      return res.status(403).json({
        success: false,
        message: '경보를 해결하려면 제어 권한이 필요합니다.',
      });
    }

    const { alarmId } = req.params;

    const alarm = await AlarmHistory.findByPk(alarmId);

    if (!alarm) {
      return res.status(404).json({
        success: false,
        message: '해당 경보를 찾을 수 없습니다.',
      });
    }

    // 해당 농장의 경보인지 확인
    if (alarm.farm_id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: '이 농장의 경보가 아닙니다.',
      });
    }

    // 해결 시간 업데이트
    alarm.resolved_at = new Date();
    await alarm.save();

    return res.json({
      success: true,
      data: alarm,
    });
  } catch (error) {
    console.error('경보 해결 처리 실패:', error);
    return res.status(500).json({
      success: false,
      message: '경보를 해결하는 중 오류가 발생했습니다.',
    });
  }
});

module.exports = router;
