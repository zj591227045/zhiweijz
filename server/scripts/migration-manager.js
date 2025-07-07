#!/usr/bin/env node

/**
 * 增量数据库迁移管理器
 * 支持版本化的增量升级，从任意版本升级到最新版本
 */

// 加载环境变量
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const logger = {
  info: (msg) => console.log(`[MIGRATION] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[MIGRATION] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[MIGRATION] ${new Date().toISOString()} - ${msg}`),
  success: (msg) => console.log(`[MIGRATION] ${new Date().toISOString()} - ✅ ${msg}`),
};

/**
 * 迁移配置
 */
const MIGRATIONS_CONFIG = {
  // 当前最新版本
  LATEST_VERSION: '1.7.0',

  // 迁移文件目录
  MIGRATIONS_DIR: path.join(__dirname, '../migrations/incremental'),

  // 版本升级路径
  UPGRADE_PATHS: {
    '1.0.0': ['1.0.0-to-1.1.0', '1.1.0-to-1.2.0', '1.2.2-to-1.3.0', 'add-service-type-to-llm-call-logs', 'add-transaction-metadata', 'add-wechat-integration', 'add-user-deletion-fields-v2', '1.4.0-to-1.5.0', '1.5.0-to-1.6.0', 'add-file-storage'],
    '1.1.0': ['1.1.0-to-1.2.0', '1.2.2-to-1.3.0', 'add-service-type-to-llm-call-logs', 'add-transaction-metadata', 'add-wechat-integration', 'add-user-deletion-fields-v2', '1.4.0-to-1.5.0', '1.5.0-to-1.6.0', 'add-file-storage'],
    '1.2.0': ['1.2.2-to-1.3.0', 'add-service-type-to-llm-call-logs', 'add-transaction-metadata', 'add-wechat-integration', 'add-user-deletion-fields-v2', '1.4.0-to-1.5.0', '1.5.0-to-1.6.0', 'add-file-storage'],
    '1.2.1': ['1.2.2-to-1.3.0', 'add-service-type-to-llm-call-logs', 'add-transaction-metadata', 'add-wechat-integration', 'add-user-deletion-fields-v2', '1.4.0-to-1.5.0', '1.5.0-to-1.6.0', 'add-file-storage'],
    '1.2.2': ['1.2.2-to-1.3.0', 'add-service-type-to-llm-call-logs', 'add-transaction-metadata', 'add-wechat-integration', 'add-user-deletion-fields-v2', '1.4.0-to-1.5.0', '1.5.0-to-1.6.0', 'add-file-storage'],
    '1.2.3': ['1.2.2-to-1.3.0', 'add-wechat-integration', 'add-user-deletion-fields-v2', '1.4.0-to-1.5.0', '1.5.0-to-1.6.0', 'add-file-storage'],
    '1.3.0': ['add-wechat-integration', 'add-user-deletion-fields-v2', '1.4.0-to-1.5.0', '1.5.0-to-1.6.0', 'add-file-storage'],
    '1.3.1': ['add-user-deletion-fields-v2', '1.4.0-to-1.5.0', '1.5.0-to-1.6.0', 'add-file-storage'],
    '1.3.2': ['add-user-deletion-fields-v2', '1.4.0-to-1.5.0', '1.5.0-to-1.6.0', 'add-file-storage'],
    '1.4.0': ['1.4.0-to-1.5.0', '1.5.0-to-1.6.0', 'add-file-storage'], // 升级到1.7.0
    '1.5.0': ['1.5.0-to-1.6.0', 'add-file-storage'], // 升级到1.7.0
    '1.6.0': ['add-file-storage'], // 升级到1.7.0
    '1.7.0': [], // 当前最新版本
    'fresh_install': ['base-schema', 'admin-features', '1.1.0-to-1.2.0', '1.2.2-to-1.3.0', 'add-service-type-to-llm-call-logs', 'add-transaction-metadata', 'add-wechat-integration', 'add-user-deletion-fields-v2', '1.4.0-to-1.5.0', '1.5.0-to-1.6.0', 'add-file-storage']
  }
};

/**
 * 获取当前数据库版本
 */
async function getCurrentVersion() {
  try {
    // 检查是否存在schema_versions表
    const schemaVersionExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_versions'
      );
    `;
    
    if (!schemaVersionExists[0].exists) {
      // 检查是否是全新安装
      const usersTableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `;
      
      if (!usersTableExists[0].exists) {
        logger.info('检测到全新安装');
        return 'fresh_install';
      } else {
        logger.info('检测到旧版本数据库，假设为 1.0.0');
        return '1.0.0';
      }
    }
    
    // 获取最新版本记录
    const versionRecord = await prisma.$queryRaw`
      SELECT version FROM schema_versions 
      ORDER BY applied_at DESC 
      LIMIT 1;
    `;
    
    if (versionRecord.length > 0) {
      const version = versionRecord[0].version;
      logger.info(`当前数据库版本: ${version}`);
      return version;
    } else {
      logger.warn('版本表存在但无记录，假设为 1.0.0');
      return '1.0.0';
    }
    
  } catch (error) {
    logger.error(`获取当前版本失败: ${error.message}`);
    return '1.0.0'; // 默认假设为旧版本
  }
}

/**
 * 获取需要执行的迁移列表
 */
function getMigrationsToRun(currentVersion, targetVersion = MIGRATIONS_CONFIG.LATEST_VERSION) {
  const migrations = MIGRATIONS_CONFIG.UPGRADE_PATHS[currentVersion] || [];
  
  if (currentVersion === targetVersion) {
    logger.info('数据库已是最新版本，无需迁移');
    return [];
  }
  
  if (migrations.length === 0) {
    logger.warn(`无法找到从版本 ${currentVersion} 到 ${targetVersion} 的升级路径`);
    return [];
  }
  
  logger.info(`计划执行 ${migrations.length} 个迁移: ${migrations.join(', ')}`);
  return migrations;
}

/**
 * 执行单个迁移文件
 */
async function executeMigration(migrationName) {
  const migrationPath = path.join(MIGRATIONS_CONFIG.MIGRATIONS_DIR, `${migrationName}.sql`);
  
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`迁移文件不存在: ${migrationPath}`);
  }
  
  logger.info(`执行迁移: ${migrationName}`);
  
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  // 解析SQL文件中的元数据
  const metadata = parseMigrationMetadata(sql);
  
  // 分割SQL语句 - 支持PostgreSQL的DO $$块
  const statements = parsePostgreSQLStatements(sql);
  
  logger.info(`执行 ${statements.length} 个SQL语句...`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    try {
      await prisma.$executeRawUnsafe(statement);
      if (i % 10 === 0) {
        logger.info(`已执行 ${i + 1}/${statements.length} 个语句`);
      }
    } catch (error) {
      // 某些错误可以忽略
      if (shouldIgnoreError(error)) {
        logger.warn(`忽略错误: ${error.message.substring(0, 100)}...`);
      } else {
        logger.error(`SQL执行失败: ${statement.substring(0, 100)}...`);
        throw error;
      }
    }
  }
  
  // 记录迁移历史
  await recordMigration(migrationName, metadata);
  
  logger.success(`迁移 ${migrationName} 执行完成`);
}

/**
 * 解析PostgreSQL语句，正确处理DO $$块
 */
function parsePostgreSQLStatements(sql) {
  // 移除META注释块
  sql = sql.replace(/\/\*META[\s\S]*?\*\//, '');
  
  // 移除单行注释
  sql = sql.replace(/^--.*$/gm, '');
  
  // 简化的语句分割：按分号分割，然后重新组合特殊块
  const rawStatements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  const statements = [];
  let current = '';
  let inSpecialBlock = false;
  
  for (let i = 0; i < rawStatements.length; i++) {
    const stmt = rawStatements[i];
    
    if (current) {
      current += '; ' + stmt;
    } else {
      current = stmt;
    }
    
    // 检查是否进入特殊块（DO $$块或函数定义）
    if (stmt.includes('DO $$') || stmt.includes('CREATE OR REPLACE FUNCTION') || stmt.includes('RETURNS TRIGGER AS $$')) {
      inSpecialBlock = true;
      continue;
    }
    
    // 检查是否退出特殊块
    if (inSpecialBlock && (stmt.includes('END $$') || stmt.includes("$$ language"))) {
      inSpecialBlock = false;
      statements.push(current + ';');
      current = '';
      continue;
    }
    
    // 如果不在特殊块中，每个分号结束一个语句
    if (!inSpecialBlock) {
      statements.push(current + ';');
      current = '';
    }
  }
  
  // 添加最后一个语句（如果有）
  if (current.trim()) {
    statements.push(current + ';');
  }
  
  return statements.filter(stmt => stmt.trim().length > 0);
}

/**
 * 解析迁移文件元数据
 */
function parseMigrationMetadata(sql) {
  const metadata = {
    version: null,
    description: '',
    author: '',
    date: new Date().toISOString()
  };
  
  const metaMatch = sql.match(/\/\*META\s*([\s\S]*?)\*\//);
  if (metaMatch) {
    const metaText = metaMatch[1];
    const versionMatch = metaText.match(/VERSION:\s*(.+)/);
    const descMatch = metaText.match(/DESCRIPTION:\s*(.+)/);
    const authorMatch = metaText.match(/AUTHOR:\s*(.+)/);
    
    if (versionMatch) metadata.version = versionMatch[1].trim();
    if (descMatch) metadata.description = descMatch[1].trim();
    if (authorMatch) metadata.author = authorMatch[1].trim();
  }
  
  return metadata;
}

/**
 * 判断是否应该忽略错误
 */
function shouldIgnoreError(error) {
  const ignorableErrors = [
    'already exists',
    'duplicate',
    'does not exist',
    'relation .* already exists'
  ];
  
  return ignorableErrors.some(pattern => 
    error.message.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * 记录迁移历史
 */
async function recordMigration(migrationName, metadata) {
  try {
    // 确保schema_versions表存在
    await ensureSchemaVersionsTable();
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO schema_versions (
        version, 
        description, 
        migration_file, 
        applied_at
      ) VALUES ($1, $2, $3, NOW())
      ON CONFLICT (migration_file) DO NOTHING;
    `, 
    metadata.version || migrationName,
    metadata.description || `Migration: ${migrationName}`,
    migrationName
    );
    
  } catch (error) {
    logger.warn(`记录迁移历史失败: ${error.message}`);
  }
}

/**
 * 确保schema_versions表存在
 */
async function ensureSchemaVersionsTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        id SERIAL PRIMARY KEY,
        version VARCHAR(20) NOT NULL,
        description TEXT,
        migration_file VARCHAR(255),
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    // 确保migration_file字段有UNIQUE约束
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE schema_versions ADD CONSTRAINT schema_versions_migration_file_unique UNIQUE (migration_file);
      EXCEPTION
        WHEN duplicate_table THEN null;
        WHEN others THEN 
          -- 如果约束已存在或其他错误，忽略
          null;
      END $$;
    `);
    
  } catch (error) {
    logger.warn(`创建schema_versions表失败: ${error.message}`);
  }
}

/**
 * 主迁移流程
 */
async function runMigrations(targetVersion = MIGRATIONS_CONFIG.LATEST_VERSION) {
  try {
    logger.info('开始数据库迁移流程...');
    
    // 1. 获取当前版本
    const currentVersion = await getCurrentVersion();
    
    // 2. 确定需要执行的迁移
    const migrations = getMigrationsToRun(currentVersion, targetVersion);
    
    if (migrations.length === 0) {
      logger.success('数据库已是最新版本，无需迁移');
      return;
    }
    
    // 3. 执行迁移
    for (const migration of migrations) {
      await executeMigration(migration);
    }
    
    // 4. 更新版本记录
    await updateVersionRecord(targetVersion);
    
    logger.success(`数据库成功升级到版本 ${targetVersion}`);
    
  } catch (error) {
    logger.error(`迁移失败: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 更新版本记录
 */
async function updateVersionRecord(version) {
  try {
    await recordMigration('version-update', {
      version: version,
      description: `Updated to version ${version}`,
      author: 'migration-manager',
      date: new Date().toISOString()
    });
  } catch (error) {
    logger.warn(`更新版本记录失败: ${error.message}`);
  }
}

/**
 * 检查迁移状态
 */
async function checkMigrationStatus() {
  try {
    const currentVersion = await getCurrentVersion();
    const targetVersion = MIGRATIONS_CONFIG.LATEST_VERSION;
    const migrations = getMigrationsToRun(currentVersion, targetVersion);
    
    console.log('\n=== 迁移状态检查 ===');
    console.log(`当前版本: ${currentVersion}`);
    console.log(`目标版本: ${targetVersion}`);
    console.log(`待执行迁移: ${migrations.length > 0 ? migrations.join(', ') : '无'}`);
    
    if (migrations.length > 0) {
      console.log('\n可用的迁移文件:');
      migrations.forEach(migration => {
        const migrationPath = path.join(MIGRATIONS_CONFIG.MIGRATIONS_DIR, `${migration}.sql`);
        const exists = fs.existsSync(migrationPath);
        console.log(`  ${migration}: ${exists ? '✅' : '❌'}`);
      });
    }
    
    console.log('===================\n');
    
  } catch (error) {
    logger.error(`检查迁移状态失败: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

// 命令行界面
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';
  const targetVersion = args[1] || MIGRATIONS_CONFIG.LATEST_VERSION;
  
  return { command, targetVersion };
}

async function main() {
  const { command, targetVersion } = parseArgs();
  
  switch (command) {
    case 'migrate':
    case 'upgrade':
      await runMigrations(targetVersion);
      break;
      
    case 'status':
    case 'check':
      await checkMigrationStatus();
      break;
      
    case 'version':
      const currentVersion = await getCurrentVersion();
      console.log(currentVersion);
      await prisma.$disconnect();
      break;
      
    default:
      console.log(`
使用方法:
  node migration-manager.js migrate [target_version]  # 执行迁移到指定版本
  node migration-manager.js status                    # 检查迁移状态
  node migration-manager.js version                   # 显示当前版本

示例:
  node migration-manager.js migrate                   # 升级到最新版本
  node migration-manager.js migrate 1.1.0            # 升级到指定版本
  node migration-manager.js status                    # 查看状态
      `);
      await prisma.$disconnect();
      break;
  }
}

if (require.main === module) {
  main().catch((error) => {
    logger.error(`执行失败: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runMigrations,
  getCurrentVersion,
  checkMigrationStatus,
  MIGRATIONS_CONFIG
}; 