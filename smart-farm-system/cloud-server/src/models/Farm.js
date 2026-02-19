/**
 * 농장 모델
 * 각 농장의 기본 정보 및 AWS IoT 연동 설정
 */
module.exports = (sequelize, DataTypes) => {
  const Farm = sequelize.define('Farm', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    organization_id: {
      type: DataTypes.UUID,
      references: {
        model: 'organizations',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(200),
    },
    aws_thing_name: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
    },
    mqtt_topic_prefix: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'active',
    },
    last_online_at: {
      type: DataTypes.DATE,
    },
    config_json: {
      type: DataTypes.JSONB,
    },
    latest_sensor_data: {
      type: DataTypes.JSONB,
      comment: 'RPi HTTP 전송 최신 센서 스냅샷 (60초 주기)',
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'farms',
    timestamps: false,
    underscored: true,
  });

  return Farm;
};
