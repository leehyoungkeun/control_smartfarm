-- farms 테이블에 latest_sensor_data JSONB 컬럼 추가
-- RPi에서 60초마다 HTTP 전송하는 센서 스냅샷 저장용
ALTER TABLE farms ADD COLUMN IF NOT EXISTS latest_sensor_data JSONB;
