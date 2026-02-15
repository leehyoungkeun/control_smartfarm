/**
 * 사용자 관리 라우트
 * 조직 내 사용자 CRUD 및 농장 권한 관리
 * 모든 라우트는 인증 필요 (routes/index.js에서 적용)
 */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { sequelize, User, FarmUser, Farm } = require('../models');
const { requireRole } = require('../middleware/roleCheck');

/**
 * GET /api/users
 * 같은 조직의 사용자 목록 조회 (농장 수 포함)
 * admin 이상 권한 필요
 */
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    // 같은 조직의 사용자 목록 조회
    const users = await User.findAll({
      where: { organization_id: req.user.organization_id },
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
    });

    // 각 사용자의 할당된 농장 수 조회
    const usersWithFarmCount = await Promise.all(
      users.map(async (user) => {
        try {
          const farmCount = await FarmUser.count({
            where: { user_id: user.id },
          });
          return {
            ...user.toJSON(),
            farmCount,
          };
        } catch (countError) {
          console.error('농장 수 조회 오류:', countError);
          return {
            ...user.toJSON(),
            farmCount: 0,
          };
        }
      })
    );

    return res.json({
      success: true,
      data: usersWithFarmCount,
    });
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

/**
 * POST /api/users
 * 같은 조직에 사용자 생성
 * admin 이상 권한 필요, superadmin 역할 생성 불가
 */
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { username, email, password, role, phone } = req.body;

    // 필수 필드 검증
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '사용자명, 이메일, 비밀번호는 필수 입력값입니다.',
      });
    }

    // superadmin 역할 생성 차단
    if (role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'superadmin 역할은 생성할 수 없습니다.',
      });
    }

    // 비밀번호 최소 길이 검증
    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 최소 4자 이상이어야 합니다.',
      });
    }

    // 이메일 중복 확인
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 이메일입니다.',
      });
    }

    // 사용자명 중복 확인
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 사용자명입니다.',
      });
    }

    // 비밀번호 해싱
    const passwordHash = await bcrypt.hash(password, 10);

    // 사용자 생성 (같은 조직에 소속)
    const user = await User.create({
      organization_id: req.user.organization_id,
      username,
      email,
      password_hash: passwordHash,
      role: role || 'viewer',
      phone: phone || null,
    });

    return res.status(201).json({
      success: true,
      message: '사용자가 생성되었습니다.',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        organization_id: user.organization_id,
        phone: user.phone,
        is_active: user.is_active,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('사용자 생성 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

/**
 * PUT /api/users/:id
 * 사용자 정보 수정 (같은 조직만)
 * admin 이상 권한 필요
 */
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, phone, is_active } = req.body;

    // 대상 사용자 조회
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    // 같은 조직 확인
    if (user.organization_id !== req.user.organization_id) {
      return res.status(403).json({
        success: false,
        message: '다른 조직의 사용자를 수정할 수 없습니다.',
      });
    }

    // superadmin 역할 변경 차단
    if (role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'superadmin 역할로 변경할 수 없습니다.',
      });
    }

    // 이메일 중복 확인 (변경 시)
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: '이미 사용 중인 이메일입니다.',
        });
      }
    }

    // 사용자명 중복 확인 (변경 시)
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          message: '이미 사용 중인 사용자명입니다.',
        });
      }
    }

    // 업데이트할 필드 구성
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (is_active !== undefined) updateData.is_active = is_active;

    await user.update(updateData);

    return res.json({
      success: true,
      message: '사용자 정보가 수정되었습니다.',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        organization_id: user.organization_id,
        phone: user.phone,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    console.error('사용자 수정 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

/**
 * DELETE /api/users/:id
 * 사용자 비활성화 (소프트 삭제 — is_active = false)
 * admin 이상 권한 필요
 */
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // 대상 사용자 조회
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    // 같은 조직 확인
    if (user.organization_id !== req.user.organization_id) {
      return res.status(403).json({
        success: false,
        message: '다른 조직의 사용자를 삭제할 수 없습니다.',
      });
    }

    // 자기 자신 삭제 방지
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: '자기 자신은 비활성화할 수 없습니다.',
      });
    }

    // 소프트 삭제 (비활성화)
    await user.update({ is_active: false });

    return res.json({
      success: true,
      message: '사용자가 비활성화되었습니다.',
    });
  } catch (error) {
    console.error('사용자 삭제 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

/**
 * PUT /api/users/:id/farms
 * 사용자의 농장 접근 권한 설정
 * 기존 권한 삭제 후 새 권한 일괄 등록 (트랜잭션)
 * Body: { farms: [{ farmId, permission }] }
 * admin 이상 권한 필요
 */
router.put('/:id/farms', requireRole('admin'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { farms } = req.body;

    // farms 배열 검증
    if (!Array.isArray(farms)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'farms는 배열이어야 합니다.',
      });
    }

    // 대상 사용자 조회
    const user = await User.findByPk(id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    // 같은 조직 확인
    if (user.organization_id !== req.user.organization_id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: '다른 조직의 사용자 권한을 수정할 수 없습니다.',
      });
    }

    // 요청된 농장이 같은 조직에 속하는지 확인
    for (const farmEntry of farms) {
      const farm = await Farm.findByPk(farmEntry.farmId, { transaction });
      if (!farm || farm.organization_id !== req.user.organization_id) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `농장 ${farmEntry.farmId}을(를) 찾을 수 없거나 접근 권한이 없습니다.`,
        });
      }
    }

    // 기존 농장 권한 전부 삭제
    await FarmUser.destroy({
      where: { user_id: id },
      transaction,
    });

    // 새 농장 권한 일괄 생성
    if (farms.length > 0) {
      const farmUserRecords = farms.map((farmEntry) => ({
        farm_id: farmEntry.farmId,
        user_id: id,
        permission: farmEntry.permission || 'view',
      }));
      await FarmUser.bulkCreate(farmUserRecords, { transaction });
    }

    await transaction.commit();

    return res.json({
      success: true,
      message: '사용자 농장 권한이 업데이트되었습니다.',
      data: { userId: id, farms },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('사용자 농장 권한 설정 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

module.exports = router;
