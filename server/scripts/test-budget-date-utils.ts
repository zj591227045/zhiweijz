#!/usr/bin/env ts-node

import { BudgetDateUtils } from '../src/utils/budget-date-utils';

/**
 * 格式化日期为本地日期字符串（避免时区问题）
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 测试BudgetDateUtils工具类
 * 
 * 使用方法：
 * npm run test-budget-date-utils
 */

function testBudgetDateUtils() {
  console.log('='.repeat(60));
  console.log('开始测试BudgetDateUtils工具类');
  console.log('='.repeat(60));

  try {
    // 1. 测试基本的周期计算
    console.log('\n1. 测试基本的周期计算...');
    
    const testCases = [
      { year: 2024, month: 6, refreshDay: 1 },
      { year: 2024, month: 6, refreshDay: 5 },
      { year: 2024, month: 6, refreshDay: 10 },
      { year: 2024, month: 6, refreshDay: 15 },
      { year: 2024, month: 6, refreshDay: 20 },
      { year: 2024, month: 6, refreshDay: 25 },
    ];

    for (const testCase of testCases) {
      const period = BudgetDateUtils.calculateBudgetPeriod(
        testCase.year, 
        testCase.month, 
        testCase.refreshDay
      );
      
      console.log(`RefreshDay ${testCase.refreshDay}:`);
      console.log(`  周期: ${BudgetDateUtils.formatPeriod(period)}`);
      console.log(`  开始: ${formatLocalDate(period.startDate)}`);
      console.log(`  结束: ${formatLocalDate(period.endDate)}`);
      console.log(`  天数: ${BudgetDateUtils.calculatePeriodDays(period)}天`);
    }

    // 2. 测试当前周期计算
    console.log('\n2. 测试当前周期计算...');
    
    const currentDate = new Date();
    console.log(`当前日期: ${formatLocalDate(currentDate)}`);
    
    for (const refreshDay of [1, 5, 10, 15, 20, 25]) {
      const currentPeriod = BudgetDateUtils.getCurrentBudgetPeriod(currentDate, refreshDay);
      const remaining = BudgetDateUtils.getRemainingDays(currentPeriod, currentDate);
      
      console.log(`RefreshDay ${refreshDay}: ${BudgetDateUtils.formatPeriod(currentPeriod)}, 剩余${remaining}天`);
    }

    // 3. 测试跨月情况
    console.log('\n3. 测试跨月情况...');
    
    // 测试月末的情况
    const monthEndDate = new Date(2024, 5, 30); // 2024年6月30日
    console.log(`测试日期: ${formatLocalDate(monthEndDate)}`);

    for (const refreshDay of [1, 25]) {
      const period = BudgetDateUtils.getCurrentBudgetPeriod(monthEndDate, refreshDay);
      console.log(`RefreshDay ${refreshDay}: ${BudgetDateUtils.formatPeriod(period)}`);
      console.log(`  开始: ${formatLocalDate(period.startDate)}`);
      console.log(`  结束: ${formatLocalDate(period.endDate)}`);
    }

    // 4. 测试缺失周期计算
    console.log('\n4. 测试缺失周期计算...');
    
    const lastEndDate = new Date(2024, 4, 31); // 2024年5月31日
    const currentTestDate = new Date(2024, 6, 15); // 2024年7月15日
    
    console.log(`最后预算结束: ${formatLocalDate(lastEndDate)}`);
    console.log(`当前日期: ${formatLocalDate(currentTestDate)}`);
    
    for (const refreshDay of [1, 15, 25]) {
      const missingPeriods = BudgetDateUtils.calculateMissingPeriods(
        lastEndDate, 
        currentTestDate, 
        refreshDay
      );
      
      console.log(`RefreshDay ${refreshDay}: 需要创建 ${missingPeriods.length} 个周期`);
      for (const period of missingPeriods) {
        console.log(`  - ${BudgetDateUtils.formatPeriod(period)}`);
      }
    }

    // 5. 测试下一个和上一个周期
    console.log('\n5. 测试下一个和上一个周期...');
    
    const basePeriod = BudgetDateUtils.calculateBudgetPeriod(2024, 6, 15);
    const nextPeriod = BudgetDateUtils.getNextBudgetPeriod(basePeriod);
    const prevPeriod = BudgetDateUtils.getPreviousBudgetPeriod(basePeriod);
    
    console.log(`基础周期: ${BudgetDateUtils.formatPeriod(basePeriod)}`);
    console.log(`下一周期: ${BudgetDateUtils.formatPeriod(nextPeriod)}`);
    console.log(`上一周期: ${BudgetDateUtils.formatPeriod(prevPeriod)}`);

    // 6. 测试日期范围检查
    console.log('\n6. 测试日期范围检查...');
    
    const testPeriod = BudgetDateUtils.calculateBudgetPeriod(2024, 6, 15);
    const testDates = [
      new Date(2024, 5, 10), // 6月10日 - 应该在周期前
      new Date(2024, 5, 15), // 6月15日 - 应该在周期内
      new Date(2024, 5, 20), // 6月20日 - 应该在周期内
      new Date(2024, 6, 10), // 7月10日 - 应该在周期内
      new Date(2024, 6, 14), // 7月14日 - 应该在周期内（结束日期）
      new Date(2024, 6, 20), // 7月20日 - 应该在周期后
    ];
    
    console.log(`测试周期: ${BudgetDateUtils.formatPeriod(testPeriod)}`);
    for (const testDate of testDates) {
      const isInPeriod = BudgetDateUtils.isDateInPeriod(testDate, testPeriod);
      console.log(`  ${formatLocalDate(testDate)}: ${isInPeriod ? '✅ 在周期内' : '❌ 不在周期内'}`);
    }

    // 7. 测试错误处理
    console.log('\n7. 测试错误处理...');
    
    try {
      BudgetDateUtils.calculateBudgetPeriod(2024, 6, 7); // 无效的refreshDay
      console.log('❌ 应该抛出错误但没有');
    } catch (error) {
      console.log('✅ 正确捕获无效refreshDay错误:', (error as Error).message);
    }

    console.log('\n='.repeat(60));
    console.log('✅ BudgetDateUtils工具类测试完成');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n='.repeat(60));
    console.error('❌ 测试执行失败:', error);
    console.error('='.repeat(60));
    throw error;
  }
}

// 如果直接运行此脚本，执行测试
if (require.main === module) {
  testBudgetDateUtils();
  console.log('\n🎉 测试成功完成');
}

export { testBudgetDateUtils };
