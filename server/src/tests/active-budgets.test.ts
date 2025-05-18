import { BudgetService } from '../services/budget.service';
import { FamilyRepository } from '../repositories/family.repository';
import { BudgetRepository } from '../repositories/budget.repository';

/**
 * 测试活跃预算API
 *
 * 这个测试脚本用于验证getActiveBudgets方法是否正确返回用户的个人预算和家庭预算
 */
async function testActiveBudgets() {
  try {
    // 创建服务实例
    const budgetService = new BudgetService();

    // 使用一个实际存在的用户ID
    // 这里使用一个示例ID，实际使用时应替换为数据库中存在的用户ID
    const userId = process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000000';

    console.log(`开始测试用户 ${userId} 的活跃预算...`);

    // 获取活跃预算
    const activeBudgets = await budgetService.getActiveBudgets(userId);

    console.log(`找到 ${activeBudgets.length} 个活跃预算`);

    // 打印每个预算的详细信息
    activeBudgets.forEach((budget, index) => {
      console.log(`\n预算 ${index + 1}:`);
      console.log(`ID: ${budget.id}`);
      console.log(`名称: ${budget.name}`);
      console.log(`账本ID: ${budget.accountBookId}`);
      console.log(`账本名称: ${budget.accountBookName}`);
      console.log(`账本类型: ${budget.accountBookType}`);
      console.log(`家庭ID: ${budget.familyId || '无'}`);
      console.log(`金额: ${budget.amount}`);
      console.log(`已使用: ${budget.spent || 0}`);
      console.log(`剩余: ${budget.remaining || 0}`);
    });

    console.log('\n测试完成!');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 执行测试
testActiveBudgets();
