-- 일일 요약 아카이브 테이블 (RPi에서 동기화)
CREATE TABLE IF NOT EXISTS daily_summary_archive (
    id BIGSERIAL PRIMARY KEY,
    farm_id UUID REFERENCES farms(id) NOT NULL,
    summary_date DATE NOT NULL,
    program_number INTEGER NOT NULL,
    run_count INTEGER DEFAULT 0,
    set_ec DECIMAL(4,1),
    set_ph DECIMAL(4,1),
    avg_ec DECIMAL(4,1),
    avg_ph DECIMAL(4,1),
    total_supply_liters DECIMAL(10,1) DEFAULT 0,
    total_drain_liters DECIMAL(10,1) DEFAULT 0,
    valve_flows JSONB,
    UNIQUE(farm_id, summary_date, program_number)
);
