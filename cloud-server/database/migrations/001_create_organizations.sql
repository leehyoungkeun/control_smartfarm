-- 조직(테넌트) 테이블
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    plan VARCHAR(20) DEFAULT 'basic',
    max_farms INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 기본 조직 삽입
INSERT INTO organizations (name, plan, max_farms)
VALUES ('기본 조직', 'enterprise', 100)
ON CONFLICT DO NOTHING;
