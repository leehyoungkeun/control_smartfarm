/**
 * 경보 이력 모델
 * 농장에서 발생한 경보 기록 관리
 */
module.exports = (sequelize, DataTypes) => {
  const AlarmHistory = sequelize.define('AlarmHistory', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    farm_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'farms',
        key: 'id',
      },
    },
    occurred_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    alarm_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    alarm_value: {
      type: DataTypes.DECIMAL(8, 2),
    },
    threshold_value: {
      type: DataTypes.DECIMAL(8, 2),
    },
    resolved_at: {
      type: DataTypes.DATE,
    },
    message: {
      type: DataTypes.TEXT,
    },
  }, {
    tableName: 'alarm_history',
    timestamps: false,
    underscored: true,
  });

  return AlarmHistory;
};
