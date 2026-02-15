/**
 * JWT 인증 미들웨어
 * Authorization: Bearer <token> 검증
 */
const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * 요청 헤더에서 JWT 토큰을 추출하고 검증하는 미들웨어
 * 검증 성공 시 req.user에 사용자 정보를 저장
 */
const authenticate = async (req, res, next) => {
  try {
    // Authorization 헤더 확인
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
    }

    // 토큰 추출 및 검증
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // DB에서 사용자 조회 (활성 상태 확인)
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: '유효하지 않은 사용자입니다.' });
    }

    // 요청 객체에 사용자 정보 저장
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
    };
    next();
  } catch (error) {
    // 토큰 만료 에러 별도 처리
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '인증 토큰이 만료되었습니다.' });
    }
    return res.status(401).json({ success: false, message: '유효하지 않은 인증 토큰입니다.' });
  }
};

module.exports = { authenticate };
