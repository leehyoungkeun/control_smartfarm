/**
 * 제어 로그 모델
 * 농장 제어 명령 실행 기록 관리
 */
module.exports = (sequelize, DataTypes) => {
  const ControlLog = sequelize.define('ControlLog', {
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
    user_id: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    command_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    command_detail: {
      type: DataTypes.JSONB,
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    executed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    result: {
      type: DataTypes.STRING(20),
      defaultValue: 'success',
    },
    result_detail: {
      type: DataTypes.TEXT,
    },
  }, {
    tableName: 'control_logs',
    timestamps: false,
    underscored: true,
  });

  return ControlLog;
};
