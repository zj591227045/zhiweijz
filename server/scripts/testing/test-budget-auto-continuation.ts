#!/usr/bin/env ts-node

import { PrismaClient, BudgetType, BudgetPeriod } from '@prisma/client';
import { BudgetService } from '../src/services/budget.service';
import { BudgetDateUtils } from '../src/utils/budget-date-utils';

const prisma = new PrismaClient();

/**
 * 测试预算自动延续功能
 * 
 * 使用方法：
 * npm run test-budget-auto-continuation
 */

async function testBudgetAutoContinuation() {
  console.log('='.repeat(60));
  console.log('开始测试预算自动延续功能');
  console.log('='.repeat(60));

  const budgetService = new BudgetService();

  try {
    // 1. 查找一个有历史预算但没有当前月份预算的用户
    console.log('\n1. 查找测试用户...');
    
    const currentDate = new Date();
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    // 查找有历史预算的用户
    const historicalBudgets = await prisma.budget.findMany({
      where: {
        budgetType: BudgetType.PERSONAL,
        period: BudgetPeriod.MONTHLY,
        familyMemberId: null,
        endDate: {
          lt: currentMonthStart
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      take: 1
    });

    if (historicalBudgets.length === 0) {
      console.log('❌ 没有找到合适的测试用户（需要有历史预算记录）');
      return;
    }

    const testBudget = historicalBudgets[0];
    const userId = testBudget.userId!;
    const accountBookId = testBudget.accountBookId!;
    const refreshDay = (testBudget as any).refreshDay || 1;

    console.log(`✅ 找到测试用户: ${testBudget.user?.name} (${testBudget.user?.email})`);
    console.log(`   历史预算: ${testBudget.name}, 结束日期: ${testBudget.endDate}`);
    console.log(`   刷新日期: ${refreshDay}日`);
    console.log(`   账本ID: ${accountBookId}`);

    // 2. 检查当前预算周期状态
    console.log('\n2. 检查当前预算周期状态...');

    // 计算当前预算周期
    const currentPeriod = BudgetDateUtils.getCurrentBudgetPeriod(currentDate, refreshDay);
    console.log(`   当前预算周期: ${BudgetDateUtils.formatPeriod(currentPeriod)}`);
    console.log(`   周期开始: ${currentPeriod.startDate.toISOString().split('T')[0]}`);
    console.log(`   周期结束: ${currentPeriod.endDate.toISOString().split('T')[0]}`);

    const existingCurrentBudget = await prisma.budget.findFirst({
      where: {
        userId,
        accountBookId,
        budgetType: BudgetType.PERSONAL,
        period: BudgetPeriod.MONTHLY,
        familyMemberId: null,
        startDate: {
          gte: currentPeriod.startDate,
          lte: currentPeriod.endDate
        }
      }
    });

    if (existingCurrentBudget) {
      console.log(`✅ 用户已有当前周期预算: ${existingCurrentBudget.name}`);
      console.log('   测试场景：验证正常查询功能');
    } else {
      console.log('❌ 用户没有当前周期预算');
      console.log('   测试场景：验证自动创建功能');
    }

    // 3. 测试getActiveBudgets方法
    console.log('\n3. 测试getActiveBudgets方法...');
    
    const startTime = Date.now();
    const activeBudgets = await budgetService.getActiveBudgets(userId, accountBookId);
    const endTime = Date.now();
    
    console.log(`✅ 查询完成，耗时: ${endTime - startTime}ms`);
    console.log(`   返回预算数量: ${activeBudgets.length}`);
    
    if (activeBudgets.length > 0) {
      const budget = activeBudgets[0];
      console.log(`   预算详情:`);
      console.log(`     名称: ${budget.name}`);
      console.log(`     金额: ${budget.amount}`);
      console.log(`     开始日期: ${budget.startDate}`);
      console.log(`     结束日期: ${budget.endDate}`);
      console.log(`     已使用: ${budget.spent || 0}`);
      console.log(`     剩余: ${budget.remaining || 0}`);
    }

    // 4. 验证预算数据完整性
    console.log('\n4. 验证预算数据完整性...');
    
    const allUserBudgets = await prisma.budget.findMany({
      where: {
        userId,
        accountBookId,
        budgetType: BudgetType.PERSONAL,
        period: BudgetPeriod.MONTHLY,
        familyMemberId: null
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    console.log(`✅ 用户总预算数量: ${allUserBudgets.length}`);
    
    // 检查预算连续性
    let hasGaps = false;
    for (let i = 1; i < allUserBudgets.length; i++) {
      const prevBudget = allUserBudgets[i - 1];
      const currentBudget = allUserBudgets[i];
      
      const prevEndDate = new Date(prevBudget.endDate);
      const currentStartDate = new Date(currentBudget.startDate);
      
      // 计算日期差（应该是1天，即连续的）
      const daysDiff = Math.floor((currentStartDate.getTime() - prevEndDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 1) {
        hasGaps = true;
        console.log(`❌ 发现预算间隔: ${prevBudget.endDate} -> ${currentBudget.startDate}`);
      }
    }
    
    if (!hasGaps) {
      console.log('✅ 预算时间连续性检查通过');
    }

    // 5. 测试预算查询性能
    console.log('\n5. 测试预算查询性能...');
    
    const performanceTests = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await budgetService.getActiveBudgets(userId, accountBookId);
      const end = Date.now();
      performanceTests.push(end - start);
    }
    
    const avgTime = performanceTests.reduce((a, b) => a + b, 0) / performanceTests.length;
    console.log(`✅ 平均查询时间: ${avgTime.toFixed(2)}ms`);
    console.log(`   最快: ${Math.min(...performanceTests)}ms`);
    console.log(`   最慢: ${Math.max(...performanceTests)}ms`);

    // 6. 测试BudgetDateUtils工具类
    console.log('\n6. 测试BudgetDateUtils工具类...');

    // 测试不同refreshDay的周期计算
    const testRefreshDays = [1, 5, 10, 15, 20, 25];
    for (const testRefreshDay of testRefreshDays) {
      const period = BudgetDateUtils.getCurrentBudgetPeriod(currentDate, testRefreshDay);
      const days = BudgetDateUtils.calculatePeriodDays(period);
      const remaining = BudgetDateUtils.getRemainingDays(period, currentDate);

      console.log(`   RefreshDay ${testRefreshDay}: ${BudgetDateUtils.formatPeriod(period)}`);
      console.log(`     周期天数: ${days}天, 剩余天数: ${remaining}天`);
    }

    console.log('\n='.repeat(60));
    console.log('✅ 预算自动延续功能测试完成');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n='.repeat(60));
    console.error('❌ 测试执行失败:', error);
    console.error('='.repeat(60));
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本，执行测试
if (require.main === module) {
  testBudgetAutoContinuation()
    .then(() => {
      console.log('\n🎉 测试成功完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 测试失败:', error);
      process.exit(1);
    });
}

export { testBudgetAutoContinuation };
