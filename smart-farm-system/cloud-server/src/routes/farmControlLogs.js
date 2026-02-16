/**
 * 농장 제어 로그 라우터
 * 제어 명령 실행 이력 조회 (페이지네이션 지원)
 */
const router = require('express').Router({ mergeParams: true });
const { Op } = require('sequelize');
const { ControlLog, User } = require('../models');

/**
 * GET /
 * 제어 로그 조회 (페이지네이션)
 * - page: 페이지 번호 (기본값 1)
 * - limit: 페이지당 항목 수 (기본값 20)
 * - from: 시작 일시 필터
 * - to: 종료 일시 필터
 * - user: 사용자 ID 필터
 */
router.get('/', async (req, res) => {
  try {
    const farmId = req.params.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const { from, to, user } = req.query;

    // 기본 조건: 해당 농장의 제어 로그
    const where = { farm_id: farmId };

    // 실행 일시 범위 필터
    if (from || to) {
      where.executed_at = {};
      if (from) {
        where.executed_at[Op.gte] = new Date(from);
      }
      if (to) {
        where.executed_at[Op.lte] = new Date(to);
      }
    }

    // 사용자 필터
    if (user) {
      where.user_id = user;
    }

    const { count: total, rows: logs } = await ControlLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ['username'],
        },
      ],
      order: [['executed_at', 'DESC']],
      limit,
      offset,
    });

    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error('제어 로그 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '제어 로그를 조회하는 중 오류가 발생했습니다.',
    });
  }
});

module.exports = router;
