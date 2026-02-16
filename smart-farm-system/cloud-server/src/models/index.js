/**
 * Sequelize 모델 초기화 및 관계 설정
 * 모든 모델을 로드하고 테이블 간 연관관계를 정의
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// 모델 로드
const Organization = require('./Organization')(sequelize, DataTypes);
const User = require('./User')(sequelize, DataTypes);
const Farm = require('./Farm')(sequelize, DataTypes);
const FarmUser = require('./FarmUser')(sequelize, DataTypes);
const AlarmHistory = require('./AlarmHistory')(sequelize, DataTypes);
const ControlLog = require('./ControlLog')(sequelize, DataTypes);
const DailySummaryArchive = require('./DailySummaryArchive')(sequelize, DataTypes);
const NotificationSetting = require('./NotificationSetting')(sequelize, DataTypes);

// === 연관관계 설정 ===

// 조직 - 사용자 (1:N)
Organization.hasMany(User, { foreignKey: 'organization_id' });
User.belongsTo(Organization, { foreignKey: 'organization_id' });

// 조직 - 농장 (1:N)
Organization.hasMany(Farm, { foreignKey: 'organization_id' });
Farm.belongsTo(Organization, { foreignKey: 'organization_id' });

// 농장 - 사용자 (N:M, farm_users 중간 테이블 경유)
Farm.belongsToMany(User, { through: FarmUser, foreignKey: 'farm_id' });
User.belongsToMany(Farm, { through: FarmUser, foreignKey: 'user_id' });

// 경보 이력 - 농장 (N:1)
AlarmHistory.belongsTo(Farm, { foreignKey: 'farm_id' });

// 제어 로그 - 농장 (N:1)
ControlLog.belongsTo(Farm, { foreignKey: 'farm_id' });
// 제어 로그 - 사용자 (N:1)
ControlLog.belongsTo(User, { foreignKey: 'user_id' });

// 일일 요약 아카이브 - 농장 (N:1)
DailySummaryArchive.belongsTo(Farm, { foreignKey: 'farm_id' });

// 알림 설정 - 사용자 (N:1)
NotificationSetting.belongsTo(User, { foreignKey: 'user_id' });
// 알림 설정 - 농장 (N:1)
NotificationSetting.belongsTo(Farm, { foreignKey: 'farm_id' });

module.exports = {
  sequelize,
  Organization,
  User,
  Farm,
  FarmUser,
  AlarmHistory,
  ControlLog,
  DailySummaryArchive,
  NotificationSetting,
};
