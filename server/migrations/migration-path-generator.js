/**
 * 迁移路径生成器
 * 根据版本配置自动生成迁移路径，消除手工维护的复杂性
 *
 * 重构说明 (2025-09-28):
 * - 移除了手工维护的 FRESH_INSTALL_MIGRATIONS 常量
 * - 改为基于 VERSION_TO_MIGRATIONS 和 DB_VERSION_HISTORY 自动生成
 * - 建立了单一数据源，避免数据不一致问题
 * - 自动包含所有版本的迁移，无需手工更新
 */

const {
  getVersionsBetween,
  getLatestDbVersion,
  isValidDbVersion
} = require('./version-config');

// 版本到迁移文件的映射
const VERSION_TO_MIGRATIONS = {
  '1.0.0': ['fix-missing-account-book-id-fields'],
  '1.1.0': ['1.0.0-to-1.1.0'],
  '1.2.0': ['1.1.0-to-1.2.0'],
  '1.2.1': [],
  '1.2.2': [],
  '1.2.3': ['1.2.2-to-1.3.0'],
  '1.3.0': ['add-service-type-to-llm-call-logs'],
  '1.3.1': ['add-transaction-metadata'],
  '1.3.2': ['add-wechat-integration'],
  '1.4.0': ['add-user-deletion-fields-v2', '1.4.0-to-1.5.0'],
  '1.5.0': ['1.5.0-to-1.6.0'],
  '1.6.0': ['add-file-storage'],
  '1.7.0': ['add-multimodal-ai-configs'],
  '1.7.1': ['fix-webm-audio-format'],
  '1.7.2': ['add-smart-accounting-prompts'],
  '1.7.3': ['add-accounting-points-system'],
  '1.7.4': ['add-last-daily-gift-date'],
  '1.7.5': ['add-membership-system'],
  '1.7.6': ['add-payment-system'],
  '1.7.7': ['add-image-compression-configs'],
  '1.7.8': ['add-compression-stats-table', 'ai-service-management-restructure'],
  '1.7.9': ['fix-daily-gift-concurrency'],
  '1.7.10': ['fix-budget-schema'],
  '1.7.11': ['add-family-member-custodial-fields'],
  '1.7.12': ['fix-invitations-table'],
  '1.7.13': ['add-budget-unique-constraint'],
  '1.7.14': ['add-version-management'],
  '1.7.15': [],
  '1.7.16': ['add-detail-url-to-app-versions'],
  '1.8.0': ['1.8.0-expand-membership-system'],
  '1.8.1': ['update-smart-accounting-prompts-v1.8.1'],
  '1.8.2': ['add-registration-gift-config'],
  '1.8.3': ['add-multi-budget-allocation'],
  '1.8.4': ['add-family-member-id-to-budget-histories'],
  '1.8.5': ['h5-payment-orders'],
};

// 基础迁移文件（不属于版本化迁移的基础设施）
const BASE_MIGRATIONS = [
  'base-schema',      // 基础数据库结构
  'admin-features'    // 管理员功能基础
];



/**
 * 自动生成全新安装需要的所有迁移
 * 基于 VERSION_TO_MIGRATIONS 和 DB_VERSION_HISTORY 自动计算
 */
function generateFreshInstallMigrations() {
  const { DB_VERSION_HISTORY } = require('./version-config');

  const migrations = [...BASE_MIGRATIONS];

  // 按版本历史顺序添加所有版本的迁移
  for (const version of DB_VERSION_HISTORY) {
    const versionMigrations = VERSION_TO_MIGRATIONS[version] || [];
    migrations.push(...versionMigrations);
  }

  return migrations;
}

// 动态生成的全新安装迁移列表
const FRESH_INSTALL_MIGRATIONS = generateFreshInstallMigrations();

/**
 * 生成从指定版本到目标版本的迁移路径
 */
function generateMigrationPath(fromVersion, toVersion = null) {
  // 处理全新安装
  if (fromVersion === 'fresh_install') {
    return FRESH_INSTALL_MIGRATIONS;
  }
  
  // 设置默认目标版本
  if (!toVersion) {
    toVersion = getLatestDbVersion();
  }
  
  // 验证版本有效性
  if (!isValidDbVersion(fromVersion)) {
    throw new Error(`无效的起始版本: ${fromVersion}`);
  }
  
  if (!isValidDbVersion(toVersion)) {
    throw new Error(`无效的目标版本: ${toVersion}`);
  }
  
  // 如果已经是目标版本，无需迁移
  if (fromVersion === toVersion) {
    return [];
  }
  
  // 获取需要经过的版本
  const versionsToUpgrade = getVersionsBetween(fromVersion, toVersion);
  
  // 收集所有需要的迁移文件
  const migrations = [];
  
  for (const version of versionsToUpgrade) {
    const versionMigrations = VERSION_TO_MIGRATIONS[version] || [];
    migrations.push(...versionMigrations);
  }
  
  return migrations;
}

/**
 * 生成所有版本的升级路径配置
 */
function generateAllUpgradePaths() {
  const upgradePaths = {};
  
  // 为每个历史版本生成升级路径
  const allVersions = Object.keys(VERSION_TO_MIGRATIONS);
  
  for (const version of allVersions) {
    upgradePaths[version] = generateMigrationPath(version);
  }
  
  // 添加全新安装路径
  upgradePaths['fresh_install'] = FRESH_INSTALL_MIGRATIONS;
  
  return upgradePaths;
}



/**
 * 验证迁移路径的完整性
 */
function validateMigrationPaths() {
  const errors = [];
  const fs = require('fs');
  const path = require('path');

  const migrationsDir = path.join(__dirname, 'incremental');

  // 检查所有引用的迁移文件是否存在
  const allMigrations = new Set();

  // 收集所有迁移文件
  Object.values(VERSION_TO_MIGRATIONS).forEach(migrations => {
    migrations.forEach(migration => allMigrations.add(migration));
  });

  FRESH_INSTALL_MIGRATIONS.forEach(migration => allMigrations.add(migration));

  // 检查文件是否存在
  for (const migration of allMigrations) {
    const filePath = path.join(migrationsDir, `${migration}.sql`);
    if (!fs.existsSync(filePath)) {
      errors.push(`迁移文件不存在: ${migration}.sql`);
    }
  }

  return errors;
}

module.exports = {
  generateMigrationPath,
  generateAllUpgradePaths,
  validateMigrationPaths,
  generateFreshInstallMigrations,
  VERSION_TO_MIGRATIONS,
  FRESH_INSTALL_MIGRATIONS,
  BASE_MIGRATIONS
};
