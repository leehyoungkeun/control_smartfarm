/**
 * Sequelize 데이터베이스 설정
 * PostgreSQL 연결 구성
 */
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'smartfarm_cc',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 20,       // 최대 연결 수
    min: 2,        // 최소 연결 수
    acquire: 30000, // 연결 획득 대기 시간 (ms)
    idle: 10000,   // 유휴 연결 해제 시간 (ms)
  },
});

module.exports = sequelize;
