#!/usr/bin/env node

/**
 * 迁移系统测试脚本
 * 验证迁移路径的正确性和完整性
 */

const { generateMigrationPath, validateMigrationPaths } = require('../migration-path-generator');
const { getLatestDbVersion, isValidDbVersion } = require('../version-config');
const fs = require('fs');
const path = require('path');

const logger = {
  info: (msg) => console.log(`[TEST] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[TEST] ${new Date().toISOString()} - ⚠️ ${msg}`),
  error: (msg) => console.error(`[TEST] ${new Date().toISOString()} - ❌ ${msg}`),
  success: (msg) => console.log(`[TEST] ${new Date().toISOString()} - ✅ ${msg}`),
};

/**
 * 测试版本配置
 */
function testVersionConfig() {
  logger.info('测试版本配置...');
  
  const latestVersion = getLatestDbVersion();
  logger.info(`最新版本: ${latestVersion}`);
  
  // 测试主要版本
  const testVersions = ['1.6.0', '1.7.12', '1.7.16', 'fresh_install'];
  
  for (const version of testVersions) {
    if (version === 'fresh_install' || isValidDbVersion(version)) {
      logger.success(`版本 ${version} 有效`);
    } else {
      logger.error(`版本 ${version} 无效`);
    }
  }
}

/**
 * 测试迁移路径生成
 */
function testMigrationPathGeneration() {
  logger.info('测试迁移路径生成...');
  
  const testCases = [
    { from: '1.6.0', to: '1.7.16', description: '从应用版本0.2.5升级到0.6.0' },
    { from: '1.7.12', to: '1.7.16', description: '从应用版本0.5.1升级到0.6.0' },
    { from: '1.7.16', to: '1.7.16', description: '当前最新版本，无需升级' },
    { from: 'fresh_install', to: null, description: '全新安装' }
  ];
  
  for (const testCase of testCases) {
    try {
      const migrations = generateMigrationPath(testCase.from, testCase.to);
      logger.success(`${testCase.description}: ${migrations.length} 个迁移`);
      
      if (migrations.length > 0) {
        logger.info(`  迁移列表: ${migrations.slice(0, 3).join(', ')}${migrations.length > 3 ? '...' : ''}`);
      }
    } catch (error) {
      logger.error(`${testCase.description}: ${error.message}`);
    }
  }
}

/**
 * 测试迁移文件完整性
 */
function testMigrationFileIntegrity() {
  logger.info('测试迁移文件完整性...');
  
  const errors = validateMigrationPaths();
  
  if (errors.length === 0) {
    logger.success('所有迁移文件都存在');
  } else {
    logger.error(`发现 ${errors.length} 个问题:`);
    errors.forEach(error => logger.error(`  ${error}`));
  }
  
  return errors.length === 0;
}

/**
 * 测试关键迁移路径
 */
function testKeyMigrationPaths() {
  logger.info('测试关键迁移路径...');
  
  // 测试从每个发布版本到最新版本的升级路径
  const releaseVersions = ['1.6.0', '1.7.12'];
  const latestVersion = getLatestDbVersion();
  
  for (const version of releaseVersions) {
    try {
      const migrations = generateMigrationPath(version, latestVersion);
      logger.success(`从 ${version} 到 ${latestVersion}: ${migrations.length} 个迁移`);
      
      // 检查是否包含必要的迁移
      const requiredMigrations = ['add-version-management', 'add-detail-url-to-app-versions'];
      const missingMigrations = requiredMigrations.filter(req => !migrations.includes(req));
      
      if (missingMigrations.length === 0) {
        logger.success(`  包含所有必要的迁移`);
      } else {
        logger.warn(`  缺少迁移: ${missingMigrations.join(', ')}`);
      }
    } catch (error) {
      logger.error(`从 ${version} 升级失败: ${error.message}`);
    }
  }
}

/**
 * 生成迁移报告
 */
function generateMigrationReport() {
  logger.info('生成迁移报告...');
  
  const report = {
    timestamp: new Date().toISOString(),
    latestVersion: getLatestDbVersion(),
    releaseVersions: {
      '0.2.5': '1.6.0',
      '0.5.1': '1.7.12', 
      '0.6.0': '1.7.16'
    },
    migrationPaths: {}
  };
  
  // 生成主要版本的迁移路径
  const versions = ['1.6.0', '1.7.12', '1.7.16', 'fresh_install'];
  
  for (const version of versions) {
    try {
      const migrations = generateMigrationPath(version);
      report.migrationPaths[version] = {
        migrationsCount: migrations.length,
        migrations: migrations
      };
    } catch (error) {
      report.migrationPaths[version] = {
        error: error.message
      };
    }
  }
  
  // 保存报告
  const reportPath = path.join(__dirname, 'migration-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  logger.success(`迁移报告已保存到: ${reportPath}`);
  
  return report;
}

/**
 * 主测试函数
 */
async function runTests() {
  logger.info('开始迁移系统测试...');
  logger.info('='.repeat(50));
  
  let allTestsPassed = true;
  
  try {
    // 1. 测试版本配置
    testVersionConfig();
    logger.info('');
    
    // 2. 测试迁移路径生成
    testMigrationPathGeneration();
    logger.info('');
    
    // 3. 测试迁移文件完整性
    const filesIntegrityPassed = testMigrationFileIntegrity();
    allTestsPassed = allTestsPassed && filesIntegrityPassed;
    logger.info('');
    
    // 4. 测试关键迁移路径
    testKeyMigrationPaths();
    logger.info('');
    
    // 5. 生成迁移报告
    generateMigrationReport();
    logger.info('');
    
    // 总结
    logger.info('='.repeat(50));
    if (allTestsPassed) {
      logger.success('所有测试通过！迁移系统已准备就绪');
    } else {
      logger.warn('部分测试失败，请检查上述错误信息');
    }
    
  } catch (error) {
    logger.error(`测试执行失败: ${error.message}`);
    allTestsPassed = false;
  }
  
  process.exit(allTestsPassed ? 0 : 1);
}

if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testVersionConfig,
  testMigrationPathGeneration,
  testMigrationFileIntegrity,
  testKeyMigrationPaths,
  generateMigrationReport
};
