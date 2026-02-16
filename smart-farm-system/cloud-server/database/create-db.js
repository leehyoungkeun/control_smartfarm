/**
 * 데이터베이스 생성 + 마이그레이션 스크립트
 * smartfarm_cc 데이터베이스 자동 생성 및 테이블 마이그레이션
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function createDatabase() {
  // postgres 기본 DB에 연결하여 smartfarm_cc 존재 여부 확인
  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    await adminClient.connect();
    const result = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = 'smartfarm_cc'"
    );

    if (result.rows.length === 0) {
      await adminClient.query('CREATE DATABASE smartfarm_cc');
      console.log('✅ smartfarm_cc 데이터베이스 생성 완료');
    } else {
      console.log('ℹ️  smartfarm_cc 데이터베이스가 이미 존재합니다');
    }
  } finally {
    await adminClient.end();
  }
}

async function runMigrations() {
  // smartfarm_cc 데이터베이스에 연결하여 마이그레이션 실행
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'smartfarm_cc',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    const migrationsDir = path.join(__dirname, 'migrations');
    // SQL 파일만 필터링하고 정렬하여 순서대로 실행
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      console.log(`✅ ${file} 마이그레이션 완료`);
    }
    console.log('\n🎉 모든 마이그레이션이 완료되었습니다');
  } finally {
    await client.end();
  }
}

// 메인 실행
(async () => {
  try {
    await createDatabase();
    await runMigrations();
  } catch (error) {
    console.error('❌ 데이터베이스 설정 실패:', error.message);
    process.exit(1);
  }
})();
