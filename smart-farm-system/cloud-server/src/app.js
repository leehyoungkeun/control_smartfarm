/**
 * Express 앱 설정
 * 미들웨어 및 라우트 구성
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');

const app = express();

// 보안 헤더 설정
app.use(helmet());

// CORS 허용 (환경변수로 허용 도메인 제한, 미설정 시 전체 허용)
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : undefined;
app.use(cors({
  origin: corsOrigins || true,
  credentials: true,
}));

// HTTP 요청 로깅
app.use(morgan('combined'));

// JSON 본문 파싱 (최대 10MB)
app.use(express.json({ limit: '10mb' }));

// RPi 직접 전송 라우트 (JWT 인증 아님, X-Api-Secret 인증)
app.use('/api/rpi-ingest', require('./routes/rpiIngest'));

// API 라우트
app.use('/api', routes);

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 처리 — 등록되지 않은 경로
app.use((req, res) => {
  res.status(404).json({ success: false, message: '요청한 리소스를 찾을 수 없습니다.' });
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('서버 오류:', err);
  res.status(500).json({ success: false, message: '서버 내부 오류가 발생했습니다.' });
});

module.exports = app;
