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
const { getLatestDbVersion, MIGRATION_TO_VERSION_MAP } = require('./version-config');
const { generateMigrationPath } = require('./migration-path-generator');

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
  // 当前最新版本 - 使用动态获取
  get LATEST_VERSION() {
    return getLatestDbVersion();
  },

  // 迁移文件目录
  MIGRATIONS_DIR: path.join(__dirname, 'incremental'),

  // 版本升级路径 - 使用动态生成
  get UPGRADE_PATHS() {
    return this._cachedUpgradePaths || (this._cachedUpgradePaths = this._generateUpgradePaths());
  },

  // 生成升级路径的内部方法
  _generateUpgradePaths() {
    const paths = {};

    // 主要发布版本的升级路径
    const mainVersions = ['1.6.0', '1.7.12', '1.7.16'];

    for (const version of mainVersions) {
      paths[version] = generateMigrationPath(version);
    }

    // 全新安装路径
    paths['fresh_install'] = generateMigrationPath('fresh_install');

    // 为了兼容性，添加一些历史版本
    const historicalVersions = ['1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.5.0'];
    for (const version of historicalVersions) {
      paths[version] = generateMigrationPath(version);
    }

    return paths;
  },

  // 清除缓存的方法
  clearCache() {
    this._cachedUpgradePaths = null;
  }
};

/**
 * 将迁移名称映射到版本号
 */
function mapMigrationToVersion(migrationName) {
  return MIGRATION_TO_VERSION_MAP[migrationName] || migrationName;
}

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
      const rawVersion = versionRecord[0].version;
      const version = mapMigrationToVersion(rawVersion);
      logger.info(`当前数据库版本: ${rawVersion} -> ${version}`);
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
        // 已在shouldIgnoreError中记录了警告日志
        continue;
      } else {
        logger.error(`SQL执行失败: ${statement.substring(0, 100)}...`);
        logger.error(`错误详情: ${error.message}`);

        // 提供针对性的错误诊断
        if (error.message.includes('foreign key constraint')) {
          logger.error('🔍 外键约束违反 - 可能的原因:');
          logger.error('   1. 存在引用不存在记录的数据');
          logger.error('   2. 数据完整性问题');
          logger.error('   3. 需要先清理无效数据');
          logger.error('💡 建议: 检查并清理相关表中的无效引用数据');
        } else if (error.message.includes('unique constraint')) {
          logger.error('🔍 唯一约束违反 - 可能的原因:');
          logger.error('   1. 存在重复数据');
          logger.error('   2. 需要先去重');
          logger.error('💡 建议: 检查并处理重复数据');
        } else if (error.message.includes('not null constraint')) {
          logger.error('🔍 非空约束违反 - 可能的原因:');
          logger.error('   1. 存在NULL值的必填字段');
          logger.error('   2. 需要先填充默认值');
          logger.error('💡 建议: 为NULL字段设置合适的默认值');
        }

        throw error;
      }
    }
  }
  
  // 记录迁移历史
  await recordMigration(migrationName, metadata);
  
  logger.success(`迁移 ${migrationName} 执行完成`);
}

/**
 * 解析PostgreSQL语句，使用与test-real-database.js相同的已验证逻辑
 * 正确处理函数定义和DO块
 */
function parsePostgreSQLStatements(sql) {
  // 移除META注释块
  sql = sql.replace(/\/\*META[\s\S]*?\*\//, '');

  const statements = [];
  let currentStatement = '';
  let inFunction = false;
  let dollarQuoteCount = 0;

  const lines = sql.split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const trimmedLine = line.trim();

    // 跳过注释和空行
    if (trimmedLine.startsWith('--') || trimmedLine.length === 0) {
      continue;
    }

    currentStatement += line + '\n';

    // 检测函数开始
    if (trimmedLine.includes('CREATE OR REPLACE FUNCTION') ||
        trimmedLine.includes('DO $$')) {
      inFunction = true;
      // 匹配所有dollar quote标签，包括 $$, $func$, $body$ 等
      dollarQuoteCount = (trimmedLine.match(/\$[^$]*\$/g) || []).length;
    } else if (inFunction) {
      dollarQuoteCount += (trimmedLine.match(/\$[^$]*\$/g) || []).length;
    }

    // 检测函数结束
    if (inFunction && dollarQuoteCount >= 2 && dollarQuoteCount % 2 === 0) {
      inFunction = false;
      statements.push(currentStatement.trim());
      currentStatement = '';
      dollarQuoteCount = 0;
      continue;
    }

    // 普通语句以分号结束
    if (!inFunction && trimmedLine.includes(';')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }

  // 添加最后一个语句
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  return statements.filter(stmt => stmt.length > 0);
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
  const errorMessage = error.message.toLowerCase();

  const ignorableErrors = [
    // 字段/表/索引已存在
    'already exists',
    'duplicate_column',
    'duplicate_table',
    'duplicate_object',
    'relation .* already exists',

    // 约束相关
    'constraint .* already exists',
    'foreign key constraint .* already exists',
    'unique constraint .* already exists',
    'check constraint .* already exists',

    // 索引相关
    'index .* already exists',
    'duplicate key value violates unique constraint',

    // 字段/表不存在（在删除操作中）
    'column .* does not exist',
    'table .* does not exist',
    'constraint .* does not exist',
    'index .* does not exist',

    // PostgreSQL特定错误码
    '42701', // duplicate_column
    '42P07', // duplicate_table
    '42710', // duplicate_object
    '23505', // unique_violation (在某些安全操作中可忽略)
  ];

  // 检查是否匹配任何可忽略的错误模式
  const shouldIgnore = ignorableErrors.some(pattern => {
    if (pattern.includes('.*')) {
      // 正则表达式模式
      const regex = new RegExp(pattern, 'i');
      return regex.test(errorMessage);
    } else {
      // 简单字符串包含检查
      return errorMessage.includes(pattern);
    }
  });

  if (shouldIgnore) {
    logger.warn(`忽略安全错误: ${error.message.substring(0, 200)}...`);
    return true;
  }

  return false;
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
        version VARCHAR(50) NOT NULL,
        description TEXT,
        migration_file VARCHAR(255),
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 如果表已存在，尝试修改version字段长度 - 使用安全的方式
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE schema_versions ALTER COLUMN version TYPE VARCHAR(50);
      `);
    } catch (alterError) {
      // 如果修改失败，忽略错误（可能字段已经是正确类型）
      logger.warn(`修改version字段类型失败，可能已经是正确类型: ${alterError.message}`);
    }

    // 确保migration_file字段有UNIQUE约束 - 使用安全的方式
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE schema_versions ADD CONSTRAINT schema_versions_migration_file_unique UNIQUE (migration_file);
      `);
    } catch (constraintError) {
      // 如果约束已存在或其他错误，忽略
      logger.warn(`添加UNIQUE约束失败，可能约束已存在: ${constraintError.message}`);
    }

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