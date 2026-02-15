/**
 * 일일 요약 아카이브 모델
 * RPi에서 동기화된 일일 운영 요약 데이터
 */
module.exports = (sequelize, DataTypes) => {
  const DailySummaryArchive = sequelize.define('DailySummaryArchive', {
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
    summary_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    program_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    run_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    set_ec: {
      type: DataTypes.DECIMAL(4, 1),
    },
    set_ph: {
      type: DataTypes.DECIMAL(4, 1),
    },
    avg_ec: {
      type: DataTypes.DECIMAL(4, 1),
    },
    avg_ph: {
      type: DataTypes.DECIMAL(4, 1),
    },
    total_supply_liters: {
      type: DataTypes.DECIMAL(10, 1),
      defaultValue: 0,
    },
    total_drain_liters: {
      type: DataTypes.DECIMAL(10, 1),
      defaultValue: 0,
    },
    valve_flows: {
      type: DataTypes.JSONB,
    },
  }, {
    tableName: 'daily_summary_archive',
    timestamps: false,
    underscored: true,
    // 농장-날짜-프로그램 번호 조합은 고유해야 함
    indexes: [
      {
        unique: true,
        fields: ['farm_id', 'summary_date', 'program_number'],
      },
    ],
  });

  return DailySummaryArchive;
};
