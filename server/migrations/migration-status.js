#!/usr/bin/env node

/**
 * 迁移状态检查工具
 * 提供详细的数据库状态和迁移信息
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const logger = {
  info: (msg) => console.log(`[STATUS] ${msg}`),
  warn: (msg) => console.warn(`[STATUS] ⚠️ ${msg}`),
  error: (msg) => console.error(`[STATUS] ❌ ${msg}`),
  success: (msg) => console.log(`[STATUS] ✅ ${msg}`),
};

/**
 * 检查数据库连接
 */
async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.success('数据库连接正常');
    return true;
  } catch (error) {
    logger.error(`数据库连接失败: ${error.message}`);
    return false;
  }
}

/**
 * 检查关键表是否存在
 */
async function checkCriticalTables() {
  logger.info('检查关键表结构...');
  
  const criticalTables = [
    'users', 'account_books', 'categories', 'budgets', 
    'transactions', 'families', 'family_members'
  ];
  
  for (const tableName of criticalTables) {
    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = ${tableName}
      `;
      
      if (result[0].count > 0) {
        logger.success(`表 ${tableName} 存在`);
        
        // 检查记录数量
        const recordCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${tableName}`);
        logger.info(`  └─ 记录数: ${recordCount[0].count}`);
      } else {
        logger.error(`表 ${tableName} 不存在`);
      }
    } catch (error) {
      logger.error(`检查表 ${tableName} 失败: ${error.message}`);
    }
  }
}

/**
 * 检查关键字段
 */
async function checkCriticalFields() {
  logger.info('检查关键字段...');
  
  const fieldChecks = [
    { table: 'budgets', field: 'account_book_id' },
    { table: 'categories', field: 'account_book_id' },
    { table: 'users', field: 'is_active' },
    { table: 'budgets', field: 'family_member_id' },
    { table: 'budgets', field: 'refresh_day' },
  ];
  
  for (const check of fieldChecks) {
    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_name = ${check.table} AND column_name = ${check.field}
      `;
      
      if (result[0].count > 0) {
        logger.success(`字段 ${check.table}.${check.field} 存在`);
      } else {
        logger.warn(`字段 ${check.table}.${check.field} 不存在`);
      }
    } catch (error) {
      logger.error(`检查字段 ${check.table}.${check.field} 失败: ${error.message}`);
    }
  }
}

/**
 * 检查外键约束
 */
async function checkForeignKeyConstraints() {
  logger.info('检查外键约束...');
  
  const constraintChecks = [
    { table: 'budgets', constraint: 'budgets_account_book_id_fkey' },
    { table: 'categories', constraint: 'categories_account_book_id_fkey' },
    { table: 'transactions', constraint: 'transactions_budget_id_fkey' },
    { table: 'transactions', constraint: 'transactions_account_book_id_fkey' },
  ];
  
  for (const check of constraintChecks) {
    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.table_constraints 
        WHERE table_name = ${check.table} 
          AND constraint_name = ${check.constraint}
          AND constraint_type = 'FOREIGN KEY'
      `;
      
      if (result[0].count > 0) {
        logger.success(`外键约束 ${check.constraint} 存在`);
      } else {
        logger.warn(`外键约束 ${check.constraint} 不存在`);
      }
    } catch (error) {
      logger.error(`检查外键约束 ${check.constraint} 失败: ${error.message}`);
    }
  }
}

/**
 * 检查数据完整性问题
 */
async function checkDataIntegrityIssues() {
  logger.info('检查数据完整性问题...');
  
  try {
    // 检查NULL的account_book_id
    const nullAccountBookIds = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM budgets WHERE account_book_id IS NULL) as budgets_null,
        (SELECT COUNT(*) FROM categories WHERE account_book_id IS NULL) as categories_null
    `;
    
    if (nullAccountBookIds[0].budgets_null > 0) {
      logger.warn(`发现 ${nullAccountBookIds[0].budgets_null} 条budgets记录的account_book_id为NULL`);
    }
    
    if (nullAccountBookIds[0].categories_null > 0) {
      logger.warn(`发现 ${nullAccountBookIds[0].categories_null} 条categories记录的account_book_id为NULL`);
    }
    
    // 检查无效的外键引用
    const invalidRefs = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM budgets b WHERE b.account_book_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM account_books ab WHERE ab.id = b.account_book_id)) as invalid_budget_refs,
        (SELECT COUNT(*) FROM categories c WHERE c.account_book_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM account_books ab WHERE ab.id = c.account_book_id)) as invalid_category_refs
    `;
    
    if (invalidRefs[0].invalid_budget_refs > 0) {
      logger.warn(`发现 ${invalidRefs[0].invalid_budget_refs} 条budgets记录引用了不存在的account_book`);
    }
    
    if (invalidRefs[0].invalid_category_refs > 0) {
      logger.warn(`发现 ${invalidRefs[0].invalid_category_refs} 条categories记录引用了不存在的account_book`);
    }
    
    // 检查重复的唯一约束
    const duplicateBudgets = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM (
        SELECT user_id, account_book_id, budget_type::text, period, start_date, family_member_id
        FROM budgets
        WHERE user_id IS NOT NULL AND account_book_id IS NOT NULL
        GROUP BY user_id, account_book_id, budget_type, period, start_date, family_member_id
        HAVING COUNT(*) > 1
      ) as duplicates
    `;
    
    if (duplicateBudgets[0].count > 0) {
      logger.warn(`发现 ${duplicateBudgets[0].count} 组重复的budget记录`);
    }
    
  } catch (error) {
    logger.error(`数据完整性检查失败: ${error.message}`);
  }
}

/**
 * 检查迁移历史
 */
async function checkMigrationHistory() {
  logger.info('检查迁移历史...');
  
  try {
    // 检查schema_versions表是否存在
    const schemaVersionsExists = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'schema_versions'
    `;
    
    if (schemaVersionsExists[0].count > 0) {
      logger.success('schema_versions表存在');
      
      // 获取当前版本
      const currentVersion = await prisma.$queryRaw`
        SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1
      `;
      
      if (currentVersion.length > 0) {
        logger.info(`当前数据库版本: ${currentVersion[0].version}`);
      } else {
        logger.warn('schema_versions表为空');
      }
      
      // 获取迁移历史
      const migrationHistory = await prisma.$queryRaw`
        SELECT version, description, migration_file, applied_at 
        FROM schema_versions 
        ORDER BY applied_at DESC 
        LIMIT 10
      `;
      
      logger.info('最近的迁移历史:');
      migrationHistory.forEach((migration, index) => {
        logger.info(`  ${index + 1}. ${migration.version} - ${migration.description} (${migration.applied_at})`);
      });
      
    } else {
      logger.warn('schema_versions表不存在');
    }
    
  } catch (error) {
    logger.error(`检查迁移历史失败: ${error.message}`);
  }
}

/**
 * 生成诊断报告
 */
async function generateDiagnosticReport() {
  logger.info('='.repeat(60));
  logger.info('数据库状态诊断报告');
  logger.info('='.repeat(60));
  
  const isConnected = await checkDatabaseConnection();
  if (!isConnected) {
    logger.error('无法连接到数据库，请检查连接配置');
    return;
  }
  
  await checkCriticalTables();
  logger.info('');
  
  await checkCriticalFields();
  logger.info('');
  
  await checkForeignKeyConstraints();
  logger.info('');
  
  await checkDataIntegrityIssues();
  logger.info('');
  
  await checkMigrationHistory();
  logger.info('');
  
  logger.info('='.repeat(60));
  logger.info('诊断报告完成');
  logger.info('='.repeat(60));
}

/**
 * 主函数
 */
async function main() {
  try {
    await generateDiagnosticReport();
  } catch (error) {
    logger.error(`诊断失败: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateDiagnosticReport,
  checkDatabaseConnection,
  checkCriticalTables,
  checkDataIntegrityIssues
};
