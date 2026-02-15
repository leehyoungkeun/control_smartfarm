-- 제어 로그 테이블
CREATE TABLE IF NOT EXISTS control_logs (
    id BIGSERIAL PRIMARY KEY,
    farm_id UUID REFERENCES farms(id) NOT NULL,
    user_id UUID REFERENCES users(id),
    command_type VARCHAR(50) NOT NULL,
    command_detail JSONB,
    source VARCHAR(20) NOT NULL,
    executed_at TIMESTAMP DEFAULT NOW(),
    result VARCHAR(20) DEFAULT 'success',
    result_detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_control_farm_time ON control_logs(farm_id, executed_at);
