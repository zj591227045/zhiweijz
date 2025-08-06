#!/usr/bin/env node

/**
 * 预算结转历史修复脚本
 * 
 * 问题：
 * 1. 启用了预算结转的个人预算在跨月生成新预算时，没有生成预算结转历史记录
 * 2. 最新个人预算的结转金额没有正确更新
 * 
 * 解决：
 * 1. 查找所有启用了结转的预算
 * 2. 检查是否缺失结转历史记录
 * 3. 重新计算并更新结转金额
 * 4. 生成缺失的历史记录
 * 
 * 使用方法：
 * 1. 复制脚本到容器：docker cp fix-budget-rollover-history.js zhiweijz-backend:/tmp/
 * 2. 预览模式：docker exec -it zhiweijz-backend node /tmp/fix-budget-rollover-history.js --dry-run
 * 3. 修复模式：docker exec -it zhiweijz-backend node /tmp/fix-budget-rollover-history.js
 */

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// 检查是否为预览模式
const isDryRun = process.argv.includes('--dry-run');

console.log('=== 预算结转历史修复脚本 ===');
console.log(`模式: ${isDryRun ? '预览模式（不会修改数据）' : '修复模式'}`);
console.log('');

/**
 * 计算预算的已支出金额
 */
async function calculateSpentAmount(budgetId) {
  const result = await prisma.transaction.aggregate({
    where: { budgetId, type: 'EXPENSE' },
    _sum: { amount: true },
  });
  return Number(result._sum.amount || 0);
}

/**
 * 计算预算的结转金额
 */
function calculateRolloverAmount(budgetAmount, previousRollover, spentAmount) {
  const totalAvailable = Number(budgetAmount) + Number(previousRollover || 0);
  return totalAvailable - spentAmount;
}

/**
 * 检查是否存在结转历史记录
 */
async function hasRolloverHistory(budgetId, period) {
  const history = await prisma.budgetHistory.findFirst({
    where: {
      budgetId,
      period,
      type: { in: ['SURPLUS', 'DEFICIT'] }
    }
  });
  return !!history;
}

/**
 * 创建结转历史记录
 */
async function createRolloverHistory(budget, rolloverAmount, spentAmount, isDryRun) {
  const period = `${budget.endDate.getFullYear()}-${budget.endDate.getMonth() + 1}`;
  const rolloverType = rolloverAmount >= 0 ? 'SURPLUS' : 'DEFICIT';
  const rolloverDescription = rolloverAmount >= 0 ? '余额结转' : '债务结转';
  
  const historyData = {
    id: uuidv4(),
    budgetId: budget.id,
    userId: budget.userId || budget.familyMemberId, // 对于托管成员使用familyMemberId
    period,
    amount: Math.abs(rolloverAmount),
    type: rolloverType,
    description: `${rolloverDescription}: 基础预算${budget.amount}, 上期结转${budget.rolloverAmount || 0}, 实际支出${spentAmount}, 结转金额${rolloverAmount}`,
    budgetAmount: budget.amount,
    spentAmount,
    previousRollover: budget.rolloverAmount || 0,
  };

  console.log(`    ${isDryRun ? '[预览]' : '[创建]'} 结转历史: ${period} - ${rolloverDescription} ${Math.abs(rolloverAmount)}`);

  if (!isDryRun) {
    await prisma.budgetHistory.create({ data: historyData });
    console.log(`    ✅ 创建历史记录 ID: ${historyData.id}`);
  }

  return 1;
}

/**
 * 更新预算的结转金额
 */
async function updateBudgetRolloverAmount(budgetId, newRolloverAmount, isDryRun) {
  console.log(`    ${isDryRun ? '[预览]' : '[更新]'} 预算结转金额: ${newRolloverAmount}`);

  if (!isDryRun) {
    await prisma.budget.update({
      where: { id: budgetId },
      data: { rolloverAmount: newRolloverAmount }
    });
    console.log(`    ✅ 更新预算 ${budgetId} 结转金额: ${newRolloverAmount}`);
  }

  return 1;
}

/**
 * 修复预算结转历史
 */
async function fixBudgetRolloverHistory() {
  console.log('查找所有启用了结转的预算...');

  // 查找所有启用了结转的预算，按用户和结束日期排序
  const budgetsWithRollover = await prisma.budget.findMany({
    where: {
      rollover: true,
      budgetType: 'PERSONAL',
      period: 'MONTHLY'
    },
    orderBy: [
      { userId: 'asc' },
      { familyMemberId: 'asc' },
      { accountBookId: 'asc' },
      { endDate: 'asc' }
    ],
    include: {
      user: { select: { name: true } },
      familyMember: { select: { name: true } }
    }
  });

  console.log(`找到 ${budgetsWithRollover.length} 个启用了结转的预算`);

  let processedCount = 0;
  let historyCreatedCount = 0;
  let rolloverUpdatedCount = 0;
  let skippedCount = 0;

  // 按用户分组处理预算
  const budgetsByUser = new Map();
  
  for (const budget of budgetsWithRollover) {
    const userKey = budget.userId || budget.familyMemberId;
    const accountKey = `${userKey}-${budget.accountBookId}`;
    
    if (!budgetsByUser.has(accountKey)) {
      budgetsByUser.set(accountKey, []);
    }
    budgetsByUser.get(accountKey).push(budget);
  }

  for (const [accountKey, budgets] of budgetsByUser) {
    const firstBudget = budgets[0];
    const userName = firstBudget.user?.name || firstBudget.familyMember?.name || '未知用户';
    
    console.log(`\n处理用户: ${userName} (${budgets.length} 个预算)`);

    // 按时间顺序处理每个预算
    for (let i = 0; i < budgets.length; i++) {
      const budget = budgets[i];
      const nextBudget = budgets[i + 1];
      
      console.log(`  预算: ${budget.name} (${budget.endDate.toISOString().split('T')[0]})`);
      processedCount++;

      // 计算当前预算的支出
      const spentAmount = await calculateSpentAmount(budget.id);
      
      // 计算结转金额
      const rolloverAmount = calculateRolloverAmount(
        budget.amount,
        budget.rolloverAmount,
        spentAmount
      );

      console.log(`    支出: ${spentAmount}, 计算结转: ${rolloverAmount}`);

      // 检查是否需要创建结转历史记录（只有过期的预算才创建历史记录）
      const currentDate = new Date();
      if (budget.endDate < currentDate) {
        const period = `${budget.endDate.getFullYear()}-${budget.endDate.getMonth() + 1}`;
        const hasHistory = await hasRolloverHistory(budget.id, period);

        if (!hasHistory) {
          const created = await createRolloverHistory(budget, rolloverAmount, spentAmount, isDryRun);
          historyCreatedCount += created;
        } else {
          console.log(`    ✅ 已存在结转历史记录`);
        }
      } else {
        console.log(`    ⏳ 预算未过期，跳过历史记录创建`);
      }

      // 如果有下一个预算，检查其结转金额是否正确
      if (nextBudget) {
        const expectedRollover = rolloverAmount;
        const currentRollover = Number(nextBudget.rolloverAmount || 0);

        if (Math.abs(expectedRollover - currentRollover) > 0.01) { // 允许小数点误差
          console.log(`    ⚠️  下个预算结转金额不正确: 期望${expectedRollover}, 实际${currentRollover}`);
          const updated = await updateBudgetRolloverAmount(nextBudget.id, expectedRollover, isDryRun);
          rolloverUpdatedCount += updated;
        } else {
          console.log(`    ✅ 下个预算结转金额正确`);
        }
      }
    }
  }

  console.log('\n=== 修复完成 ===');
  console.log(`处理的预算数: ${processedCount}`);
  console.log(`${isDryRun ? '预览创建' : '成功创建'}的历史记录数: ${historyCreatedCount}`);
  console.log(`${isDryRun ? '预览更新' : '成功更新'}的结转金额数: ${rolloverUpdatedCount}`);
  console.log(`跳过的数量: ${skippedCount}`);

  if (isDryRun) {
    console.log('\n💡 这是预览模式，如需实际修复请移除 --dry-run 参数');
  }
}

/**
 * 验证修复结果
 */
async function verifyResults() {
  // 统计启用结转的预算总数
  const totalRolloverBudgets = await prisma.budget.count({
    where: {
      rollover: true,
      budgetType: 'PERSONAL',
      period: 'MONTHLY',
      endDate: { lt: new Date() } // 只统计已过期的预算
    }
  });

  // 统计有结转历史记录的预算数
  const budgetsWithHistory = await prisma.budget.count({
    where: {
      rollover: true,
      budgetType: 'PERSONAL',
      period: 'MONTHLY',
      endDate: { lt: new Date() },
      budgetHistories: {
        some: {
          type: { in: ['SURPLUS', 'DEFICIT'] }
        }
      }
    }
  });

  console.log('\n=== 验证结果 ===');
  console.log(`已过期的结转预算总数: ${totalRolloverBudgets}`);
  console.log(`有结转历史记录的预算数: ${budgetsWithHistory}`);
  console.log(`缺失历史记录的预算数: ${totalRolloverBudgets - budgetsWithHistory}`);

  if (totalRolloverBudgets === budgetsWithHistory) {
    console.log('🎉 所有已过期的结转预算都有历史记录！');
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

    await fixBudgetRolloverHistory();
    await verifyResults();

  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
