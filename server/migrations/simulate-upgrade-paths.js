#!/usr/bin/env node

/**
 * 模拟升级路径测试脚本
 * 验证从不同版本升级到0.7.0的完整流程
 */

const fs = require('fs');
const path = require('path');
const { generateMigrationPath } = require('./migration-path-generator');
const { getDbVersionForApp, getLatestDbVersion } = require('./version-config');

const logger = {
  info: (msg) => console.log(`[SIMULATE] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[SIMULATE] ${new Date().toISOString()} - ⚠️ ${msg}`),
  error: (msg) => console.error(`[SIMULATE] ${new Date().toISOString()} - ❌ ${msg}`),
  success: (msg) => console.log(`[SIMULATE] ${new Date().toISOString()} - ✅ ${msg}`),
};

/**
 * 验证SQL文件语法
 */
function validateSqlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  // 检查是否使用了DO块来处理幂等性
  const hasDoBlocks = /DO \$\$[\s\S]*?EXCEPTION[\s\S]*?duplicate_column/gi.test(content);

  // 检查常见的SQL语法问题
  const checks = [
    {
      pattern: /CREATE OR REPLACE FUNCTION.*\$\$[\s\S]*?END[\s\S]*?\$\$ language 'plpgsql'/gi,
      issue: "PostgreSQL函数定义语法错误：应使用 'LANGUAGE plpgsql' 而不是 'language \\'plpgsql\\''"
    },
    {
      pattern: /CREATE OR REPLACE FUNCTION.*\$\$[\s\S]*?END(?!\s*;)[\s\S]*?\$\$/gi,
      issue: "PostgreSQL函数定义缺少分号：END 后应该有分号"
    },
    {
      pattern: hasDoBlocks ? /(?!)/ : /ALTER TABLE.*ADD COLUMN(?!\s+IF NOT EXISTS)/gi,
      issue: "建议使用 'ADD COLUMN IF NOT EXISTS' 确保幂等性"
    },
    {
      pattern: /CREATE INDEX(?!\s+IF NOT EXISTS)/gi,
      issue: "建议使用 'CREATE INDEX IF NOT EXISTS' 确保幂等性"
    },
    {
      pattern: /DROP\s+(TABLE|COLUMN|INDEX)(?!.*keep|.*temp|.*temporary|.*_temp|.*_tmp)/gi,
      issue: "危险操作：包含DROP语句，可能导致数据丢失（除非是临时表）"
    }
  ];

  for (const check of checks) {
    if (check.pattern.test(content)) {
      issues.push(check.issue);
    }
  }

  return issues;
}

/**
 * 模拟单个迁移文件执行
 */
function simulateMigrationFile(migrationName) {
  const filePath = path.join(__dirname, 'incremental', `${migrationName}.sql`);
  
  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      error: `迁移文件不存在: ${migrationName}.sql`
    };
  }
  
  const issues = validateSqlFile(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lineCount = content.split('\n').length;
  
  return {
    success: issues.length === 0,
    issues: issues,
    lineCount: lineCount,
    hasMetadata: content.includes('/*META'),
    hasRollback: content.toLowerCase().includes('rollback')
  };
}

/**
 * 模拟完整的升级路径
 */
function simulateUpgradePath(fromAppVersion, toAppVersion = '0.7.0') {
  logger.info(`开始模拟从应用版本 ${fromAppVersion} 升级到 ${toAppVersion}`);
  
  const fromDbVersion = getDbVersionForApp(fromAppVersion);
  const toDbVersion = getDbVersionForApp(toAppVersion);
  
  if (!fromDbVersion) {
    logger.error(`未找到应用版本 ${fromAppVersion} 对应的数据库版本`);
    return false;
  }
  
  if (!toDbVersion) {
    logger.error(`未找到应用版本 ${toAppVersion} 对应的数据库版本`);
    return false;
  }
  
  logger.info(`数据库版本升级路径: ${fromDbVersion} → ${toDbVersion}`);
  
  try {
    const migrations = generateMigrationPath(fromDbVersion, toDbVersion);
    
    if (migrations.length === 0) {
      logger.success('无需执行迁移，已是最新版本');
      return true;
    }
    
    logger.info(`需要执行 ${migrations.length} 个迁移文件`);
    
    let allSuccess = true;
    const results = [];
    
    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      logger.info(`[${i + 1}/${migrations.length}] 模拟执行: ${migration}`);
      
      const result = simulateMigrationFile(migration);
      results.push({ migration, ...result });
      
      if (!result.success) {
        logger.error(`迁移失败: ${migration}`);
        logger.error(`错误: ${result.error || '语法问题'}`);
        if (result.issues) {
          result.issues.forEach(issue => logger.warn(`  - ${issue}`));
        }
        allSuccess = false;
      } else {
        logger.success(`迁移成功: ${migration} (${result.lineCount} 行)`);
        if (result.issues && result.issues.length > 0) {
          result.issues.forEach(issue => logger.warn(`  警告: ${issue}`));
        }
      }
    }
    
    // 生成详细报告
    const report = {
      fromAppVersion,
      toAppVersion,
      fromDbVersion,
      toDbVersion,
      migrationsCount: migrations.length,
      success: allSuccess,
      migrations: results,
      summary: {
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        withWarnings: results.filter(r => r.issues && r.issues.length > 0).length,
        withMetadata: results.filter(r => r.hasMetadata).length,
        withRollback: results.filter(r => r.hasRollback).length
      }
    };
    
    return report;
    
  } catch (error) {
    logger.error(`升级路径生成失败: ${error.message}`);
    return false;
  }
}

/**
 * 运行所有模拟测试
 */
async function runAllSimulations() {
  logger.info('开始模拟所有升级路径...');
  logger.info('='.repeat(60));
  
  const testCases = [
    { from: '0.2.5', to: '0.7.0', description: '从早期版本升级' },
    { from: '0.5.1', to: '0.7.0', description: '从中期版本升级' },
    { from: '0.6.0', to: '0.7.0', description: '从当前稳定版本升级' }
  ];
  
  const allResults = [];
  
  for (const testCase of testCases) {
    logger.info('');
    logger.info(`🔄 ${testCase.description}`);
    logger.info('-'.repeat(40));
    
    const result = simulateUpgradePath(testCase.from, testCase.to);
    allResults.push(result);
    
    if (result && result.success) {
      logger.success(`✅ 升级路径验证成功`);
      logger.info(`📊 统计: ${result.summary.successful}/${result.migrationsCount} 成功, ${result.summary.withWarnings} 个警告`);
    } else {
      logger.error(`❌ 升级路径验证失败`);
      if (result && result.summary) {
        logger.error(`📊 统计: ${result.summary.failed}/${result.migrationsCount} 失败`);
      }
    }
  }
  
  // 生成总体报告
  logger.info('');
  logger.info('='.repeat(60));
  logger.info('📋 总体模拟结果');
  
  const successfulPaths = allResults.filter(r => r && r.success).length;
  const totalPaths = allResults.filter(r => r !== false).length;
  
  if (successfulPaths === totalPaths) {
    logger.success(`🎉 所有 ${totalPaths} 个升级路径模拟成功！`);
  } else {
    logger.error(`⚠️ ${totalPaths - successfulPaths}/${totalPaths} 个升级路径存在问题`);
  }
  
  // 保存详细报告
  const reportPath = path.join(__dirname, 'upgrade-simulation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalPaths: totalPaths,
      successfulPaths: successfulPaths,
      failedPaths: totalPaths - successfulPaths
    },
    results: allResults
  }, null, 2));
  
  logger.info(`📄 详细报告已保存到: ${reportPath}`);
  
  return successfulPaths === totalPaths;
}

if (require.main === module) {
  runAllSimulations()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logger.error(`模拟执行失败: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  simulateUpgradePath,
  simulateMigrationFile,
  validateSqlFile,
  runAllSimulations
};
