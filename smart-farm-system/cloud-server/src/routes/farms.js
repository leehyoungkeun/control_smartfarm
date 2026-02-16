/**
 * 농장 관리 라우트
 * 농장 CRUD 및 하위 리소스 라우트 마운트
 * 모든 라우트는 인증 필요 (routes/index.js에서 적용)
 */
const router = require('express').Router();
const { Op } = require('sequelize');
const { Farm, FarmUser, User } = require('../models');
const { requireRole, requireFarmAccess, requireFarmControl } = require('../middleware/roleCheck');

/**
 * GET /api/farms
 * 사용자 역할에 따른 접근 가능 농장 목록 조회
 * - superadmin: 모든 농장
 * - admin: 같은 조직의 모든 농장
 * - operator/viewer: farm_users 테이블에 등록된 농장만
 */
router.get('/', async (req, res) => {
  try {
    let farms;

    if (req.user.role === 'superadmin') {
      // superadmin: 전체 농장 조회
      farms = await Farm.findAll({
        order: [['created_at', 'DESC']],
      });
    } else if (req.user.role === 'admin') {
      // admin: 같은 조직 농장 조회
      farms = await Farm.findAll({
        where: { organization_id: req.user.organization_id },
        order: [['created_at', 'DESC']],
      });
    } else {
      // operator/viewer: 할당된 농장만 조회
      const farmUsers = await FarmUser.findAll({
        where: { user_id: req.user.id },
        attributes: ['farm_id', 'permission'],
      });

      const farmIds = farmUsers.map((fu) => fu.farm_id);

      if (farmIds.length === 0) {
        return res.json({ success: true, data: [] });
      }

      farms = await Farm.findAll({
        where: {
          id: { [Op.in]: farmIds },
          organization_id: req.user.organization_id,
        },
        order: [['created_at', 'DESC']],
      });

      // 각 농장에 사용자 권한 정보 추가
      const permissionMap = {};
      farmUsers.forEach((fu) => {
        permissionMap[fu.farm_id] = fu.permission;
      });

      farms = farms.map((farm) => ({
        ...farm.toJSON(),
        userPermission: permissionMap[farm.id] || 'view',
      }));

      return res.json({ success: true, data: farms });
    }

    return res.json({ success: true, data: farms });
  } catch (error) {
    console.error('농장 목록 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

/**
 * POST /api/farms
 * 새 농장 생성 (같은 조직에 소속)
 * admin 이상 권한 필요
 */
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { name, aws_thing_name, mqtt_topic_prefix, location, config_json } = req.body;

    // 필수 필드 검증
    if (!name || !aws_thing_name || !mqtt_topic_prefix) {
      return res.status(400).json({
        success: false,
        message: '농장명, AWS Thing 이름, MQTT 토픽 접두사는 필수 입력값입니다.',
      });
    }

    // AWS Thing 이름 중복 확인
    const existingThing = await Farm.findOne({ where: { aws_thing_name } });
    if (existingThing) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 AWS Thing 이름입니다.',
      });
    }

    // 농장 생성
    const farm = await Farm.create({
      organization_id: req.user.organization_id,
      name,
      aws_thing_name,
      mqtt_topic_prefix,
      location: location || null,
      config_json: config_json || null,
    });

    return res.status(201).json({
      success: true,
      message: '농장이 생성되었습니다.',
      data: farm,
    });
  } catch (error) {
    console.error('농장 생성 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

/**
 * GET /api/farms/:id
 * 농장 상세 조회 (사용자 수 포함)
 * 농장 접근 권한 필요
 */
router.get('/:id', requireFarmAccess, async (req, res) => {
  try {
    const farm = await Farm.findByPk(req.params.id);
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: '농장을 찾을 수 없습니다.',
      });
    }

    // 해당 농장에 할당된 사용자 수 조회
    const userCount = await FarmUser.count({
      where: { farm_id: farm.id },
    });

    return res.json({
      success: true,
      data: {
        ...farm.toJSON(),
        userCount,
      },
    });
  } catch (error) {
    console.error('농장 상세 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

/**
 * PUT /api/farms/:id
 * 농장 정보 수정
 * 농장 접근 권한 + 제어 권한 필요
 */
router.put('/:id', requireFarmAccess, requireFarmControl, async (req, res) => {
  try {
    const farm = await Farm.findByPk(req.params.id);
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: '농장을 찾을 수 없습니다.',
      });
    }

    const { name, location, mqtt_topic_prefix, config_json, status } = req.body;

    // 업데이트할 필드 구성
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (mqtt_topic_prefix !== undefined) updateData.mqtt_topic_prefix = mqtt_topic_prefix;
    if (config_json !== undefined) updateData.config_json = config_json;
    if (status !== undefined) updateData.status = status;

    await farm.update(updateData);

    return res.json({
      success: true,
      message: '농장 정보가 수정되었습니다.',
      data: farm,
    });
  } catch (error) {
    console.error('농장 수정 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

/**
 * DELETE /api/farms/:id
 * 농장 비활성화 (소프트 삭제 — status = 'inactive')
 * admin 이상 권한 필요
 */
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const farm = await Farm.findByPk(req.params.id);
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: '농장을 찾을 수 없습니다.',
      });
    }

    // 같은 조직 확인 (superadmin 제외)
    if (req.user.role !== 'superadmin' && farm.organization_id !== req.user.organization_id) {
      return res.status(403).json({
        success: false,
        message: '다른 조직의 농장을 삭제할 수 없습니다.',
      });
    }

    // 소프트 삭제 (비활성화)
    await farm.update({ status: 'inactive' });

    return res.json({
      success: true,
      message: '농장이 비활성화되었습니다.',
    });
  } catch (error) {
    console.error('농장 삭제 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

// === 농장 하위 라우트 마운트 ===
// 각 하위 라우트는 인증 + 농장 접근 권한 필요
router.use('/:id/alarms', requireFarmAccess, require('./farmAlarms'));
router.use('/:id/control-logs', requireFarmAccess, require('./farmControlLogs'));
router.use('/:id/daily-summary', requireFarmAccess, require('./farmDailySummary'));
router.use('/:id/config', requireFarmAccess, require('./farmConfig'));
router.use('/:id/programs', requireFarmAccess, require('./farmPrograms'));
router.use('/:id/control', requireFarmAccess, require('./farmControl'));

module.exports = router;
