/**
 * 농장-사용자 매핑 모델
 * 사용자별 농장 접근 권한 관리
 */
module.exports = (sequelize, DataTypes) => {
  const FarmUser = sequelize.define('FarmUser', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    farm_id: {
      type: DataTypes.UUID,
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
    permission: {
      type: DataTypes.STRING(20),
      defaultValue: 'view',
    },
  }, {
    tableName: 'farm_users',
    timestamps: false,
    underscored: true,
    // 농장-사용자 조합은 고유해야 함
    indexes: [
      {
        unique: true,
        fields: ['farm_id', 'user_id'],
      },
    ],
  });

  return FarmUser;
};
