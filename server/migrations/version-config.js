/**
 * 数据库版本配置文件
 * 定义应用版本与数据库版本的对应关系
 */

// 应用版本与数据库版本的映射关系
const APP_TO_DB_VERSION_MAP = {
  '0.2.5': '1.6.0',   // 第一个稳定版本
  '0.5.1': '1.7.12',  // 中期版本
  '0.6.0': '1.7.16',  // 稳定版本
  '0.7.0': '1.8.2',   // 最新版本，包含会员系统扩展和提示词更新
  '0.8.0': '1.8.3',   // 多人预算分摊功能版本
  '0.9.0': '1.8.10',  // 更新了内置计划任务的说明
};

// 数据库版本的发布历史（按时间顺序）
const DB_VERSION_HISTORY = [
  '1.0.0', '1.1.0', '1.2.0', '1.2.1', '1.2.2', '1.2.3',
  '1.3.0', '1.3.1', '1.3.2', '1.4.0', '1.5.0', '1.6.0',
  '1.7.0', '1.7.1', '1.7.2', '1.7.3', '1.7.4', '1.7.5',
  '1.7.6', '1.7.7', '1.7.8', '1.7.9', '1.7.10', '1.7.11',
  '1.7.12', '1.7.13', '1.7.14', '1.7.15', '1.7.16', '1.8.0',
  '1.8.1', '1.8.2', '1.8.3', '1.8.4', '1.8.5', '1.8.6', '1.8.7', '1.8.8', '1.8.9', '1.8.10'
];

// 当前最新的数据库版本
const LATEST_DB_VERSION = '1.8.10';

// 迁移文件与版本的映射
const MIGRATION_TO_VERSION_MAP = {
  'add-version-management': '1.7.15',
  'add-detail-url-to-app-versions': '1.7.16',
  '1.8.0-expand-membership-system': '1.8.0',
  'update-smart-accounting-prompts-v1.8.1': '1.8.1',
  'add-registration-gift-config': '1.8.2',
  'add-multi-budget-allocation': '1.8.3',
  'add-family-member-id-to-budget-histories': '1.8.4',
  'h5-payment-orders': '1.8.5',
  'scheduled-tasks': '1.8.6',
  'add-internal-scheduled-tasks': '1.8.7',
  'add-scheduled-task-config': '1.8.8',
  'enable-default-internal-tasks': '1.8.9',
  'fix-internal-tasks-display': '1.8.10',
};

/**
 * 获取应用版本对应的数据库版本
 */
function getDbVersionForApp(appVersion) {
  return APP_TO_DB_VERSION_MAP[appVersion] || null;
}

/**
 * 获取当前最新的数据库版本
 */
function getLatestDbVersion() {
  return LATEST_DB_VERSION;
}

/**
 * 检查版本是否有效
 */
function isValidDbVersion(version) {
  return DB_VERSION_HISTORY.includes(version) || version === 'fresh_install';
}

/**
 * 获取版本在历史中的索引
 */
function getVersionIndex(version) {
  return DB_VERSION_HISTORY.indexOf(version);
}

/**
 * 比较两个版本的大小
 * @param {string} version1 
 * @param {string} version2 
 * @returns {number} -1: version1 < version2, 0: equal, 1: version1 > version2
 */
function compareVersions(version1, version2) {
  if (version1 === version2) return 0;
  
  const index1 = getVersionIndex(version1);
  const index2 = getVersionIndex(version2);
  
  if (index1 === -1 || index2 === -1) {
    throw new Error(`无效的版本号: ${version1} 或 ${version2}`);
  }
  
  return index1 < index2 ? -1 : 1;
}

/**
 * 获取从指定版本到目标版本需要的所有中间版本
 */
function getVersionsBetween(fromVersion, toVersion) {
  const fromIndex = getVersionIndex(fromVersion);
  const toIndex = getVersionIndex(toVersion);
  
  if (fromIndex === -1 || toIndex === -1) {
    throw new Error(`无效的版本号: ${fromVersion} 或 ${toVersion}`);
  }
  
  if (fromIndex >= toIndex) {
    return []; // 不需要升级或降级
  }
  
  return DB_VERSION_HISTORY.slice(fromIndex + 1, toIndex + 1);
}

module.exports = {
  APP_TO_DB_VERSION_MAP,
  DB_VERSION_HISTORY,
  LATEST_DB_VERSION,
  MIGRATION_TO_VERSION_MAP,
  getDbVersionForApp,
  getLatestDbVersion,
  isValidDbVersion,
  getVersionIndex,
  compareVersions,
  getVersionsBetween
};
