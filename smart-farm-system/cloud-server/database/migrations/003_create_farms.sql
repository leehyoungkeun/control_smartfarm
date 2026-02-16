-- 농장 테이블
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    aws_thing_name VARCHAR(100) UNIQUE NOT NULL,
    mqtt_topic_prefix VARCHAR(200) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    last_online_at TIMESTAMP,
    config_json JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farms_organization ON farms(organization_id);
CREATE INDEX IF NOT EXISTS idx_farms_thing ON farms(aws_thing_name);
