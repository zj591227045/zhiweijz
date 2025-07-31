#!/usr/bin/env node

/**
 * 数据完整性检查和修复工具
 * 在执行迁移之前运行，确保数据完整性
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const logger = {
  info: (msg) => console.log(`[DATA-CHECK] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[DATA-CHECK] ${new Date().toISOString()} - ⚠️ ${msg}`),
  error: (msg) => console.error(`[DATA-CHECK] ${new Date().toISOString()} - ❌ ${msg}`),
  success: (msg) => console.log(`[DATA-CHECK] ${new Date().toISOString()} - ✅ ${msg}`),
};

/**
 * 检查表是否存在
 */
async function tableExists(tableName) {
  try {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      );
    `;
    return result[0].exists;
  } catch (error) {
    logger.warn(`检查表 ${tableName} 是否存在时出错: ${error.message}`);
    return false;
  }
}

/**
 * 检查并修复budgets表的数据完整性
 */
async function checkAndFixBudgetsIntegrity() {
  logger.info('检查budgets表数据完整性...');

  try {
    // 首先检查budgets表是否存在
    if (!(await tableExists('budgets'))) {
      logger.info('budgets表不存在，跳过完整性检查');
      return;
    }

    // 1. 检查account_book_id字段
    const budgetsWithNullAccountBook = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM budgets WHERE account_book_id IS NULL
    `;
    
    if (budgetsWithNullAccountBook[0].count > 0) {
      logger.warn(`发现 ${budgetsWithNullAccountBook[0].count} 条budgets记录的account_book_id为NULL`);
      
      // 为NULL的account_book_id设置默认值
      const result = await prisma.$executeRaw`
        UPDATE budgets 
        SET account_book_id = (
          SELECT COALESCE(
            (SELECT ab1.id FROM account_books ab1 WHERE ab1.user_id = budgets.user_id AND ab1.is_default = true LIMIT 1),
            (SELECT ab2.id FROM account_books ab2 WHERE ab2.user_id = budgets.user_id ORDER BY ab2.created_at ASC LIMIT 1)
          )
        )
        WHERE account_book_id IS NULL 
          AND user_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM account_books ab WHERE ab.user_id = budgets.user_id)
      `;
      
      logger.success(`已修复 ${result} 条budgets记录的account_book_id`);
    }
    
    // 2. 检查无效的外键引用
    const invalidAccountBookRefs = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM budgets b 
      WHERE b.account_book_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM account_books ab WHERE ab.id = b.account_book_id)
    `;
    
    if (invalidAccountBookRefs[0].count > 0) {
      logger.warn(`发现 ${invalidAccountBookRefs[0].count} 条budgets记录引用了不存在的account_book`);
      
      // 删除无效引用的记录（谨慎操作）
      const deletedCount = await prisma.$executeRaw`
        DELETE FROM budgets 
        WHERE account_book_id IS NOT NULL 
          AND NOT EXISTS (SELECT 1 FROM account_books ab WHERE ab.id = budgets.account_book_id)
      `;
      
      logger.warn(`已删除 ${deletedCount} 条无效的budgets记录`);
    }
    
    logger.success('budgets表数据完整性检查完成');
    
  } catch (error) {
    logger.error(`budgets表数据完整性检查失败: ${error.message}`);
    throw error;
  }
}

/**
 * 检查并修复categories表的数据完整性
 */
async function checkAndFixCategoriesIntegrity() {
  logger.info('检查categories表数据完整性...');

  try {
    // 首先检查categories表是否存在
    if (!(await tableExists('categories'))) {
      logger.info('categories表不存在，跳过完整性检查');
      return;
    }

    // 1. 检查account_book_id字段
    const categoriesWithNullAccountBook = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM categories WHERE account_book_id IS NULL
    `;
    
    if (categoriesWithNullAccountBook[0].count > 0) {
      logger.warn(`发现 ${categoriesWithNullAccountBook[0].count} 条categories记录的account_book_id为NULL`);
      
      // 为NULL的account_book_id设置默认值
      const result = await prisma.$executeRaw`
        UPDATE categories 
        SET account_book_id = (
          SELECT COALESCE(
            (SELECT ab1.id FROM account_books ab1 WHERE ab1.user_id = categories.user_id AND ab1.is_default = true LIMIT 1),
            (SELECT ab2.id FROM account_books ab2 WHERE ab2.user_id = categories.user_id ORDER BY ab2.created_at ASC LIMIT 1)
          )
        )
        WHERE account_book_id IS NULL 
          AND user_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM account_books ab WHERE ab.user_id = categories.user_id)
      `;
      
      logger.success(`已修复 ${result} 条categories记录的account_book_id`);
    }
    
    // 2. 检查无效的外键引用
    const invalidAccountBookRefs = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM categories c 
      WHERE c.account_book_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM account_books ab WHERE ab.id = c.account_book_id)
    `;
    
    if (invalidAccountBookRefs[0].count > 0) {
      logger.warn(`发现 ${invalidAccountBookRefs[0].count} 条categories记录引用了不存在的account_book`);
      
      // 删除无效引用的记录（谨慎操作）
      const deletedCount = await prisma.$executeRaw`
        DELETE FROM categories 
        WHERE account_book_id IS NOT NULL 
          AND NOT EXISTS (SELECT 1 FROM account_books ab WHERE ab.id = categories.account_book_id)
      `;
      
      logger.warn(`已删除 ${deletedCount} 条无效的categories记录`);
    }
    
    logger.success('categories表数据完整性检查完成');
    
  } catch (error) {
    logger.error(`categories表数据完整性检查失败: ${error.message}`);
    throw error;
  }
}

/**
 * 检查重复的唯一约束数据
 */
async function checkDuplicateConstraints() {
  logger.info('检查重复的唯一约束数据...');

  try {
    // 首先检查budgets表是否存在
    if (!(await tableExists('budgets'))) {
      logger.info('budgets表不存在，跳过重复约束检查');
      return;
    }

    // 检查budgets表的唯一约束重复
    const duplicateBudgets = await prisma.$queryRaw`
      SELECT user_id, account_book_id, budget_type, period, start_date, family_member_id, COUNT(*) as count
      FROM budgets
      WHERE user_id IS NOT NULL AND account_book_id IS NOT NULL
      GROUP BY user_id, account_book_id, budget_type, period, start_date, family_member_id
      HAVING COUNT(*) > 1
    `;
    
    if (duplicateBudgets.length > 0) {
      logger.warn(`发现 ${duplicateBudgets.length} 组重复的budget记录`);
      
      // 对于每组重复记录，保留最新的，删除其他的
      for (const duplicate of duplicateBudgets) {
        await prisma.$executeRaw`
          DELETE FROM budgets 
          WHERE user_id = ${duplicate.user_id}
            AND account_book_id = ${duplicate.account_book_id}
            AND budget_type = ${duplicate.budget_type}
            AND period = ${duplicate.period}
            AND start_date = ${duplicate.start_date}
            AND (family_member_id = ${duplicate.family_member_id} OR (family_member_id IS NULL AND ${duplicate.family_member_id} IS NULL))
            AND id NOT IN (
              SELECT id FROM budgets 
              WHERE user_id = ${duplicate.user_id}
                AND account_book_id = ${duplicate.account_book_id}
                AND budget_type = ${duplicate.budget_type}
                AND period = ${duplicate.period}
                AND start_date = ${duplicate.start_date}
                AND (family_member_id = ${duplicate.family_member_id} OR (family_member_id IS NULL AND ${duplicate.family_member_id} IS NULL))
              ORDER BY updated_at DESC, created_at DESC 
              LIMIT 1
            )
        `;
      }
      
      logger.success('已清理重复的budget记录');
    }
    
    logger.success('重复约束检查完成');
    
  } catch (error) {
    logger.error(`重复约束检查失败: ${error.message}`);
    throw error;
  }
}

/**
 * 主检查流程
 */
async function runDataIntegrityCheck() {
  try {
    logger.info('开始数据完整性检查...');
    
    // 检查数据库连接
    await prisma.$queryRaw`SELECT 1`;
    logger.success('数据库连接正常');
    
    // 执行各项检查
    await checkAndFixBudgetsIntegrity();
    await checkAndFixCategoriesIntegrity();
    await checkDuplicateConstraints();
    
    logger.success('数据完整性检查完成，数据库已准备好进行迁移');
    
  } catch (error) {
    logger.error(`数据完整性检查失败: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runDataIntegrityCheck().catch((error) => {
    logger.error(`执行失败: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runDataIntegrityCheck,
  checkAndFixBudgetsIntegrity,
  checkAndFixCategoriesIntegrity,
  checkDuplicateConstraints
};
