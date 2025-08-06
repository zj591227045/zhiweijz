#!/usr/bin/env node

/**
 * 托管成员预算修复脚本
 * 
 * 问题：托管成员在跨月时没有自动生成新月份的预算
 * 解决：检查所有托管成员，为缺失当前月份预算的成员创建预算
 * 
 * 使用方法：
 * 1. 复制脚本到容器：docker cp fix-custodial-budgets.js zhiweijz-backend:/tmp/
 * 2. 预览模式：docker exec -it zhiweijz-backend node /tmp/fix-custodial-budgets.js --dry-run
 * 3. 修复模式：docker exec -it zhiweijz-backend node /tmp/fix-custodial-budgets.js
 */

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// 检查是否为预览模式
const isDryRun = process.argv.includes('--dry-run');

console.log('=== 托管成员预算修复脚本 ===');
console.log(`模式: ${isDryRun ? '预览模式（不会修改数据）' : '修复模式'}`);
console.log('');

/**
 * 获取当前月份的起始和结束日期
 */
function getCurrentMonthDates() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate, endDate };
}

/**
 * 计算预算结转金额
 */
async function calculateRollover(budgetId, budgetAmount, previousRollover) {
  const result = await prisma.transaction.aggregate({
    where: { budgetId, type: 'EXPENSE' },
    _sum: { amount: true },
  });

  const spent = Number(result._sum.amount || 0);
  const total = Number(budgetAmount) + Number(previousRollover || 0);
  const rollover = total - spent;

  console.log(`    结转: 预算${budgetAmount} + 上次${previousRollover || 0} - 支出${spent} = ${rollover}`);
  return rollover;
}

/**
 * 主修复函数
 */
async function fixCustodialBudgets() {
  const { startDate, endDate } = getCurrentMonthDates();
  console.log(`当前月份: ${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]}`);
  console.log('');

  // 查找所有托管成员
  const custodialMembers = await prisma.familyMember.findMany({
    where: { isCustodial: true },
    include: {
      family: {
        include: {
          accountBooks: { where: { type: 'FAMILY' } }
        }
      }
    }
  });

  console.log(`找到 ${custodialMembers.length} 个托管成员`);

  let processed = 0;
  let created = 0;
  let skipped = 0;

  for (const member of custodialMembers) {
    console.log(`\n托管成员: ${member.name}`);

    if (!member.family?.accountBooks?.length) {
      console.log(`  ⚠️  没有关联的家庭账本`);
      continue;
    }

    for (const accountBook of member.family.accountBooks) {
      console.log(`  账本: ${accountBook.name}`);
      processed++;

      // 检查是否已有当前月份预算
      const existing = await prisma.budget.findFirst({
        where: {
          familyMemberId: member.id,
          accountBookId: accountBook.id,
          budgetType: 'PERSONAL',
          period: 'MONTHLY',
          startDate: { gte: startDate, lte: endDate }
        }
      });

      if (existing) {
        console.log(`    ✅ 已有当前月份预算: ${existing.name}`);
        skipped++;
        continue;
      }

      // 查找最新预算作为模板
      const latest = await prisma.budget.findFirst({
        where: {
          familyMemberId: member.id,
          accountBookId: accountBook.id,
          budgetType: 'PERSONAL',
          period: 'MONTHLY'
        },
        orderBy: { endDate: 'desc' }
      });

      if (!latest) {
        console.log(`    ⚠️  没有历史预算，无法创建`);
        skipped++;
        continue;
      }

      console.log(`    📋 基于预算: ${latest.name} (${latest.endDate.toISOString().split('T')[0]})`);

      // 计算结转金额
      let rollover = 0;
      if (latest.rollover) {
        rollover = await calculateRollover(latest.id, latest.amount, latest.rolloverAmount);
      }

      // 创建新预算
      const newBudget = {
        id: uuidv4(),
        name: latest.name,
        amount: latest.amount,
        period: 'MONTHLY',
        startDate,
        endDate,
        budgetType: 'PERSONAL',
        rollover: latest.rollover,
        rolloverAmount: latest.rollover ? rollover : null,
        refreshDay: latest.refreshDay || 1,
        userId: accountBook.userId,
        accountBookId: accountBook.id,
        familyMemberId: member.id,
        familyId: member.familyId,
        isAutoCalculated: latest.isAutoCalculated || false,
        enableCategoryBudget: latest.enableCategoryBudget || false,
        amountModified: latest.amountModified || false
      };

      console.log(`    ${isDryRun ? '[预览]' : '[创建]'} ${newBudget.name} - 金额:${newBudget.amount} 结转:${rollover || 0}`);

      if (!isDryRun) {
        await prisma.budget.create({ data: newBudget });
        console.log(`    ✅ 创建成功 ID: ${newBudget.id}`);
      }

      created++;
    }
  }

  console.log('\n=== 修复完成 ===');
  console.log(`处理数量: ${processed}`);
  console.log(`${isDryRun ? '预览创建' : '成功创建'}: ${created}`);
  console.log(`跳过数量: ${skipped}`);

  if (isDryRun) {
    console.log('\n💡 这是预览模式，如需实际修复请移除 --dry-run 参数');
  }
}

/**
 * 验证结果
 */
async function verify() {
  const { startDate, endDate } = getCurrentMonthDates();
  
  const total = await prisma.familyMember.count({
    where: {
      isCustodial: true,
      family: { accountBooks: { some: { type: 'FAMILY' } } }
    }
  });

  const withBudget = await prisma.familyMember.count({
    where: {
      isCustodial: true,
      budgets: {
        some: {
          budgetType: 'PERSONAL',
          period: 'MONTHLY',
          startDate: { gte: startDate, lte: endDate }
        }
      }
    }
  });

  console.log('\n=== 验证结果 ===');
  console.log(`托管成员总数: ${total}`);
  console.log(`有当前月份预算: ${withBudget}`);
  console.log(`缺失预算: ${total - withBudget}`);

  if (total === withBudget) {
    console.log('🎉 所有托管成员都有当前月份预算！');
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('📡 测试数据库连接...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ 数据库连接正常\n');

    await fixCustodialBudgets();
    await verify();

  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
