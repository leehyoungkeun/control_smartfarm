/**
 * API 라우트 집합
 * 공개 라우트와 인증 필요 라우트를 분리하여 구성
 */
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { apiLimiter, authLimiter } = require('../middleware/rateLimiter');

// 인증 라우트 (공개) — 로그인/회원가입 등
router.use('/auth', authLimiter, require('./auth'));

// 이하 모든 라우트는 인증 필요
router.use(authenticate);
router.use(apiLimiter);

// 사용자 관리 라우트
router.use('/users', require('./users'));

// 농장 관리 라우트
router.use('/farms', require('./farms'));

// 관리자 라우트
router.use('/admin', require('./admin'));

// 알림 설정 라우트
router.use('/notifications', require('./notifications'));

module.exports = router;
