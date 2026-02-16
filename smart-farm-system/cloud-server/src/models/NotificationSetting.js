/**
 * 알림 설정 모델
 * 사용자별 농장 알림 수신 설정 관리
 */
module.exports = (sequelize, DataTypes) => {
  const NotificationSetting = sequelize.define('NotificationSetting', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    farm_id: {
      type: DataTypes.UUID,
      references: {
        model: 'farms',
        key: 'id',
      },
    },
    alarm_types: {
      // PostgreSQL TEXT 배열 타입
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: ['EC_HIGH', 'EC_LOW', 'PH_HIGH', 'PH_LOW', 'EMERGENCY_STOP', 'OFFLINE'],
    },
    channels: {
      // 알림 채널 배열 (email, sms 등)
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: ['email'],
    },
    quiet_hours_start: {
      // 방해 금지 시작 시간
      type: DataTypes.TIME,
    },
    quiet_hours_end: {
      // 방해 금지 종료 시간
      type: DataTypes.TIME,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'notification_settings',
    timestamps: false,
    underscored: true,
    // 사용자-농장 조합은 고유해야 함
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'farm_id'],
      },
    ],
  });

  return NotificationSetting;
};
