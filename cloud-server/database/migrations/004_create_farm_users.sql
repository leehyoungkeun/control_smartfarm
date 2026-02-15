-- 농장-사용자 매핑 테이블
CREATE TABLE IF NOT EXISTS farm_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) DEFAULT 'view',
    UNIQUE(farm_id, user_id)
);
