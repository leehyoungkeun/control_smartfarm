-- 경보 이력 테이블
CREATE TABLE IF NOT EXISTS alarm_history (
    id BIGSERIAL PRIMARY KEY,
    farm_id UUID REFERENCES farms(id) NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
    alarm_type VARCHAR(50) NOT NULL,
    alarm_value DECIMAL(8,2),
    threshold_value DECIMAL(8,2),
    resolved_at TIMESTAMP,
    message TEXT
);

CREATE INDEX IF NOT EXISTS idx_alarm_farm_time ON alarm_history(farm_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_alarm_type ON alarm_history(alarm_type);
