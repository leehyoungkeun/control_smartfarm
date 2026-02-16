/**
 * API 요청 속도 제한 미들웨어
 * DDoS 및 무차별 대입 공격 방어
 */
const rateLimit = require('express-rate-limit');

// 일반 API 제한 (분당 100회)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

// 인증 API 제한 (분당 10회) — 로그인 무차별 대입 방어
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

module.exports = { apiLimiter, authLimiter };
