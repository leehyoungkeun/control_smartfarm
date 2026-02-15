/**
 * 역할 및 농장 접근 권한 검증 미들웨어
 */
const { FarmUser, Farm } = require('../models');

/**
 * 역할 확인 미들웨어 팩토리
 * superadmin은 모든 역할을 대체할 수 있음
 * @param {...string} roles - 허용할 역할 목록
 * @returns {Function} Express 미들웨어
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }
    // superadmin은 모든 권한 보유
    if (req.user.role === 'superadmin' || roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ success: false, message: '접근 권한이 없습니다.' });
  };
};

/**
 * 농장 접근 권한 확인 미들웨어
 * req.params.id (farmId)에 대한 접근 권한 확인
 * 성공 시 req.farmPermission에 권한 레벨 저장 ('control' | 'view')
 */
const requireFarmAccess = async (req, res, next) => {
  try {
    const farmId = req.params.id;
    if (!farmId) {
      return res.status(400).json({ success: false, message: '농장 ID가 필요합니다.' });
    }

    // superadmin은 모든 농장 접근 가능
    if (req.user.role === 'superadmin') {
      req.farmPermission = 'control';
      return next();
    }

    // 농장 존재 여부 확인
    const farm = await Farm.findByPk(farmId);
    if (!farm) {
      return res.status(404).json({ success: false, message: '농장을 찾을 수 없습니다.' });
    }

    // 농장이 같은 조직에 속하는지 확인
    if (farm.organization_id !== req.user.organization_id) {
      return res.status(403).json({ success: false, message: '접근 권한이 없습니다.' });
    }

    // admin은 조직 내 모든 농장 제어 가능
    if (req.user.role === 'admin') {
      req.farmPermission = 'control';
      return next();
    }

    // operator/viewer는 farm_users 테이블에서 개별 권한 확인
    const farmUser = await FarmUser.findOne({
      where: { farm_id: farmId, user_id: req.user.id }
    });

    if (!farmUser) {
      return res.status(403).json({ success: false, message: '해당 농장에 대한 접근 권한이 없습니다.' });
    }

    req.farmPermission = farmUser.permission;
    next();
  } catch (error) {
    console.error('농장 접근 권한 확인 오류:', error);
    return res.status(500).json({ success: false, message: '서버 내부 오류가 발생했습니다.' });
  }
};

/**
 * 농장 제어 권한 확인 (requireFarmAccess 이후 사용)
 * 'control' 권한이 없으면 403 응답
 */
const requireFarmControl = (req, res, next) => {
  if (req.farmPermission !== 'control') {
    return res.status(403).json({ success: false, message: '해당 농장의 제어 권한이 없습니다.' });
  }
  next();
};

module.exports = { requireRole, requireFarmAccess, requireFarmControl };
