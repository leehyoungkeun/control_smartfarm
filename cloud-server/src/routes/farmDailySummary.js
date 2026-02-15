/**
 * 농장 일일 집계 라우터
 * 일일 운영 요약 데이터 조회 (단일 날짜, 기간 범위)
 */
const router = require('express').Router({ mergeParams: true });
const { Op } = require('sequelize');
const { DailySummaryArchive } = require('../models');

/**
 * GET /
 * 특정 날짜의 일일 집계 조회
 * - date: 조회 날짜 (필수, YYYY-MM-DD 형식)
 */
router.get('/', async (req, res) => {
  try {
    const farmId = req.params.id;
    const { date } = req.query;

    // 날짜 파라미터 필수 확인
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'date 파라미터가 필요합니다. (형식: YYYY-MM-DD)',
      });
    }

    const summaries = await DailySummaryArchive.findAll({
      where: {
        farm_id: farmId,
        summary_date: date,
      },
      order: [['program_number', 'ASC']],
    });

    return res.json({
      success: true,
      data: summaries,
    });
  } catch (error) {
    console.error('일일 집계 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '일일 집계를 조회하는 중 오류가 발생했습니다.',
    });
  }
});

/**
 * GET /range
 * 기간별 집계 조회
 * - from: 시작 날짜 (필수, YYYY-MM-DD 형식)
 * - to: 종료 날짜 (필수, YYYY-MM-DD 형식)
 */
router.get('/range', async (req, res) => {
  try {
    const farmId = req.params.id;
    const { from, to } = req.query;

    // 시작/종료 날짜 파라미터 필수 확인
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'from과 to 파라미터가 모두 필요합니다. (형식: YYYY-MM-DD)',
      });
    }

    const summaries = await DailySummaryArchive.findAll({
      where: {
        farm_id: farmId,
        summary_date: {
          [Op.between]: [from, to],
        },
      },
      order: [
        ['summary_date', 'DESC'],
        ['program_number', 'ASC'],
      ],
    });

    return res.json({
      success: true,
      data: summaries,
    });
  } catch (error) {
    console.error('기간 집계 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '기간 집계를 조회하는 중 오류가 발생했습니다.',
    });
  }
});

module.exports = router;
