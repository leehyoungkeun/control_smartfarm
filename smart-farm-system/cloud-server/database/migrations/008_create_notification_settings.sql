-- 알림 설정 테이블
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    alarm_types TEXT[] DEFAULT '{EC_HIGH,EC_LOW,PH_HIGH,PH_LOW,EMERGENCY_STOP,OFFLINE}',
    channels TEXT[] DEFAULT '{email}',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, farm_id)
);
