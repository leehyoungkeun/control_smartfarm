/**
 * 조직(테넌트) 모델
 * 멀티테넌트 SaaS 구조의 최상위 단위
 */
module.exports = (sequelize, DataTypes) => {
  const Organization = sequelize.define('Organization', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    plan: {
      type: DataTypes.STRING(20),
      defaultValue: 'basic',
    },
    max_farms: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'organizations',
    timestamps: false,
    underscored: true,
  });

  return Organization;
};
