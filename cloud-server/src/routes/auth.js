/**
 * 인증 라우트
 * 회원가입, 로그인, 비밀번호 변경, 토큰 갱신
 */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize, Organization, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { JWT_EXPIRES_IN } = require('../config/constants');

/**
 * JWT 토큰 생성 헬퍼
 * @param {Object} user - 사용자 객체
 * @returns {string} JWT 토큰
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    organization_id: user.organization_id,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * POST /api/auth/register
 * 조직 + 관리자 계정 생성 (트랜잭션 처리)
 */
router.post('/register', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { organizationName, username, email, password, phone } = req.body;

    // 필수 필드 검증
    if (!organizationName || !username || !email || !password) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '조직명, 사용자명, 이메일, 비밀번호는 필수 입력값입니다.',
      });
    }

    // 비밀번호 최소 길이 검증
    if (password.length < 4) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '비밀번호는 최소 4자 이상이어야 합니다.',
      });
    }

    // 이메일 중복 확인
    const existingUser = await User.findOne({ where: { email }, transaction });
    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 이메일입니다.',
      });
    }

    // 사용자명 중복 확인
    const existingUsername = await User.findOne({ where: { username }, transaction });
    if (existingUsername) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 사용자명입니다.',
      });
    }

    // 1. 조직 생성
    const organization = await Organization.create(
      { name: organizationName },
      { transaction }
    );

    // 2. 비밀번호 해싱 (salt 10)
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. 관리자 사용자 생성
    const user = await User.create(
      {
        organization_id: organization.id,
        username,
        email,
        password_hash: passwordHash,
        role: 'admin',
        phone: phone || null,
      },
      { transaction }
    );

    await transaction.commit();

    // JWT 토큰 발급
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          organization_id: user.organization_id,
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('회원가입 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

/**
 * POST /api/auth/login
 * 이메일/비밀번호 로그인, JWT 토큰 발급
 */
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // 필수 필드 검증 (email 또는 username 중 하나 필수)
    if ((!email && !username) || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일(또는 사용자명)과 비밀번호는 필수 입력값입니다.',
      });
    }

    // 이메일 또는 사용자명으로 사용자 조회
    // email 필드에 @가 없으면 username으로도 시도
    const identifier = email || username;
    const isEmail = identifier.includes('@');
    let user = await User.findOne({
      where: isEmail ? { email: identifier } : { username: identifier },
    });
    // username으로 못 찾으면 email로 재시도 (또는 그 반대)
    if (!user) {
      user = await User.findOne({
        where: isEmail ? { username: identifier } : { email: identifier },
      });
    }
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    // 활성 상태 확인
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: '비활성화된 계정입니다. 관리자에게 문의하세요.',
      });
    }

    // 비밀번호 비교
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    // 마지막 로그인 시간 업데이트
    await user.update({ last_login_at: new Date() });

    // JWT 토큰 발급
    const token = generateToken(user);

    return res.json({
      success: true,
      message: '로그인 성공',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          organization_id: user.organization_id,
        },
      },
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

/**
 * PUT /api/auth/change-password
 * 비밀번호 변경 (인증 필요)
 */
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 필수 필드 검증
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '현재 비밀번호와 새 비밀번호는 필수 입력값입니다.',
      });
    }

    // 새 비밀번호 최소 길이 검증
    if (newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        message: '새 비밀번호는 최소 4자 이상이어야 합니다.',
      });
    }

    // DB에서 사용자 조회 (password_hash 포함)
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    // 현재 비밀번호 확인
    const isCurrentValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      return res.status(401).json({
        success: false,
        message: '현재 비밀번호가 올바르지 않습니다.',
      });
    }

    // 새 비밀번호 해싱 및 저장
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await user.update({ password_hash: newPasswordHash });

    return res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.',
    });
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

/**
 * POST /api/auth/refresh
 * JWT 토큰 갱신 (인증 필요)
 */
router.post('/refresh', authenticate, async (req, res) => {
  try {
    // 현재 인증된 사용자 정보로 새 토큰 발급
    const token = generateToken(req.user);

    return res.json({
      success: true,
      message: '토큰이 갱신되었습니다.',
      data: {
        token,
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
          organization_id: req.user.organization_id,
        },
      },
    });
  } catch (error) {
    console.error('토큰 갱신 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

module.exports = router;
