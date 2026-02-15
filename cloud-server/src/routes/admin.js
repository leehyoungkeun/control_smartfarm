/**
 * 관리자 전체 현황 라우터
 * superadmin/admin 역할 사용자를 위한 전체 시스템 현황 조회
 * 모든 라우트에 authenticate + requireRole('superadmin', 'admin') 미들웨어 필요
 */
const router = require('express').Router({ mergeParams: true });
const { Op } = require('sequelize');
const { Farm, User, AlarmHistory } = require('../models');

/**
 * GET /overview
 * 전체 현황 대시보드 데이터
 * - superadmin: 전체 농장/사용자 통계
 * - admin: 자기 조직 내 농장/사용자 통계
 * - 온라인 판단 기준: last_online_at이 현재 시각 기준 5분 이내
 */
router.get('/overview', async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'superadmin';

    // 농장 필터 조건: admin은 자기 조직만
    const farmWhere = {};
    if (!isSuperAdmin) {
      farmWhere.organization_id = req.user.organization_id;
    }

    // 사용자 필터 조건: admin은 자기 조직만
    const userWhere = {};
    if (!isSuperAdmin) {
      userWhere.organization_id = req.user.organization_id;
    }

    // 5분 전 시각 계산
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // 전체 농장 수
    const totalFarms = await Farm.count({ where: farmWhere });

    // 온라인 농장 수 (last_online_at이 5분 이내)
    const onlineFarms = await Farm.count({
      where: {
        ...farmWhere,
        last_online_at: { [Op.gte]: fiveMinutesAgo },
      },
    });

    // 전체 사용자 수
    const totalUsers = await User.count({ where: userWhere });

    // 활성 경보 수 (미해결 경보)
    // admin인 경우 자기 조직 농장의 경보만 집계
    let activeAlarmsWhere = { resolved_at: { [Op.is]: null } };
    if (!isSuperAdmin) {
      // 조직 내 농장 ID 목록 조회
      const orgFarms = await Farm.findAll({
        where: { organization_id: req.user.organization_id },
        attributes: ['id'],
      });
      const farmIds = orgFarms.map((f) => f.id);
      activeAlarmsWhere.farm_id = { [Op.in]: farmIds };
    }
    const activeAlarms = await AlarmHistory.count({ where: activeAlarmsWhere });

    return res.json({
      success: true,
      data: {
        totalFarms,
        onlineFarms,
        totalUsers,
        activeAlarms,
      },
    });
  } catch (error) {
    console.error('관리자 현황 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '전체 현황을 조회하는 중 오류가 발생했습니다.',
    });
  }
});

/**
 * GET /alarms/recent
 * 최근 경보 50건 조회
 * - admin: 자기 조직 농장의 경보만
 * - superadmin: 전체 경보
 * 농장 이름과 AWS Thing 이름 포함
 */
router.get('/alarms/recent', async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'superadmin';

    // 경보 필터 조건
    const where = {};
    if (!isSuperAdmin) {
      // 조직 내 농장 ID 목록 조회
      const orgFarms = await Farm.findAll({
        where: { organization_id: req.user.organization_id },
        attributes: ['id'],
      });
      const farmIds = orgFarms.map((f) => f.id);
      where.farm_id = { [Op.in]: farmIds };
    }

    const alarms = await AlarmHistory.findAll({
      where,
      include: [
        {
          model: Farm,
          attributes: ['name', 'aws_thing_name'],
        },
      ],
      order: [['occurred_at', 'DESC']],
      limit: 50,
    });

    return res.json({
      success: true,
      data: alarms,
    });
  } catch (error) {
    console.error('최근 경보 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '최근 경보를 조회하는 중 오류가 발생했습니다.',
    });
  }
});

/**
 * GET /farms/offline
 * 오프라인 농장 목록 조회
 * - 오프라인 판단 기준: last_online_at이 5분 이상 전이거나 NULL
 * - status가 'active'인 농장만 대상
 * - admin: 자기 조직 농장만
 */
router.get('/farms/offline', async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'superadmin';
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // 오프라인 농장 조건
    const where = {
      status: 'active',
      [Op.or]: [
        { last_online_at: { [Op.lt]: fiveMinutesAgo } },
        { last_online_at: { [Op.is]: null } },
      ],
    };

    // admin은 자기 조직만
    if (!isSuperAdmin) {
      where.organization_id = req.user.organization_id;
    }

    const farms = await Farm.findAll({
      where,
      order: [['last_online_at', 'ASC']],
    });

    return res.json({
      success: true,
      data: farms,
    });
  } catch (error) {
    console.error('오프라인 농장 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '오프라인 농장을 조회하는 중 오류가 발생했습니다.',
    });
  }
});

module.exports = router;
