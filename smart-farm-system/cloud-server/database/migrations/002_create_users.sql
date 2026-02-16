-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',
    phone VARCHAR(20),
    receive_alarm_email BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 기본 슈퍼관리자 계정 (비밀번호: admin1234)
INSERT INTO users (organization_id, username, email, password_hash, role)
SELECT o.id, 'admin', 'admin@smartfarm.local',
    '$2b$10$fhbKs45HaR8baHC8OtLmZ.QLVjvSPO4Af3ahX6Nmu0nTqZc.7D83G',
    'superadmin'
FROM organizations o LIMIT 1;
