const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BUDGET_ID = '7ad6f6b2-e942-4c73-985f-0bce6d7d366d';

async function createTestRolloverData() {
  try {
    console.log('=== 创建测试结转历史数据 ===');
    
    // 1. 检查预算是否存在
    const budget = await prisma.budget.findUnique({
      where: { id: BUDGET_ID },
      include: {
        user: true,
        accountBook: true
      }
    });
    
    if (!budget) {
      console.log(`预算ID ${BUDGET_ID} 不存在，正在创建测试预算...`);
      
      // 创建测试预算
      const testBudget = await prisma.budget.create({
        data: {
          id: BUDGET_ID,
          name: '测试预算',
          amount: 5000,
          period: 'MONTHLY',
          budgetType: 'PERSONAL',
          rollover: true,
          rolloverAmount: 300,
          startDate: new Date('2025-06-01'),
          endDate: new Date('2025-06-30'),
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      
      console.log('✓ 测试预算创建成功:', testBudget.id);
    } else {
      console.log('✓ 找到预算:', budget.name);
      
      // 更新预算以确保启用结转
      await prisma.budget.update({
        where: { id: BUDGET_ID },
        data: {
          rollover: true,
          rolloverAmount: 300
        }
      });
      
      console.log('✓ 预算已更新，启用结转功能');
    }
    
    // 2. 清除现有的结转历史记录
    await prisma.budgetHistory.deleteMany({
      where: { budgetId: BUDGET_ID }
    });
    
    console.log('✓ 已清除现有结转历史记录');
    
    // 3. 创建测试结转历史记录
    const testHistories = [
      {
        period: '2025年4月',
        amount: 200,
        type: 'SURPLUS',
        description: '2025年4月预算结转',
        budgetAmount: 5000,
        spentAmount: 4800,
        previousRollover: 0,
      },
      {
        period: '2025年5月',
        amount: 300,
        type: 'SURPLUS',
        description: '2025年5月预算结转',
        budgetAmount: 5000,
        spentAmount: 4900,
        previousRollover: 200,
      },
      {
        period: '2025年3月',
        amount: 150,
        type: 'DEFICIT',
        description: '2025年3月预算结转',
        budgetAmount: 5000,
        spentAmount: 5150,
        previousRollover: 0,
      }
    ];
    
    for (const historyData of testHistories) {
      await prisma.budgetHistory.create({
        data: {
          budgetId: BUDGET_ID,
          period: historyData.period,
          amount: historyData.amount,
          type: historyData.type,
          description: historyData.description,
          budgetAmount: historyData.budgetAmount,
          spentAmount: historyData.spentAmount,
          previousRollover: historyData.previousRollover,
          userId: budget?.userId || null,
          accountBookId: budget?.accountBookId || null,
          budgetType: 'PERSONAL'
        }
      });
      
      console.log(`✓ 创建结转记录: ${historyData.period} - ${historyData.type === 'SURPLUS' ? '+' : '-'}${historyData.amount}`);
    }
    
    // 4. 验证创建的数据
    const createdHistories = await prisma.budgetHistory.findMany({
      where: { budgetId: BUDGET_ID },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n✓ 成功创建 ${createdHistories.length} 条结转历史记录:`);
    createdHistories.forEach(history => {
      console.log(`  - ${history.period}: ${history.type === 'SURPLUS' ? '+' : '-'}${history.amount}`);
    });
    
    console.log('\n=== 测试数据创建完成 ===');
    console.log(`预算ID: ${BUDGET_ID}`);
    console.log('现在可以测试 API：');
    console.log(`GET /api/budgets/${BUDGET_ID}/rollover-history`);
    
  } catch (error) {
    console.error('创建测试数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestRolloverData(); 