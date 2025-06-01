const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRolloverHistory() {
  try {
    console.log('=== 测试预算结转历史 ===');
    
    // 1. 查找所有预算
    const budgets = await prisma.budget.findMany({
      where: {
        rollover: true // 只查找启用了结转的预算
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });
    
    console.log(`找到 ${budgets.length} 个启用结转的预算:`);
    budgets.forEach(budget => {
      console.log(`- ${budget.name} (ID: ${budget.id}, 用户: ${budget.user?.name || '未知'})`);
    });
    
    // 2. 查找所有结转历史记录
    const allHistory = await prisma.budgetHistory.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n找到 ${allHistory.length} 条结转历史记录:`);
    allHistory.forEach(history => {
      console.log(`- ${history.period}: ${history.type === 'SURPLUS' ? '+' : '-'}${history.amount} (预算ID: ${history.budgetId})`);
    });
    
    // 3. 测试用户级别查询
    if (budgets.length > 0) {
      const testBudget = budgets[0];
      console.log(`\n测试用户级别查询 (用户ID: ${testBudget.userId}, 账本ID: ${testBudget.accountBookId}):`);
      
      const userHistory = await prisma.budgetHistory.findMany({
        where: {
          userId: testBudget.userId,
          accountBookId: testBudget.accountBookId,
          budgetType: 'PERSONAL'
        },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log(`找到 ${userHistory.length} 条用户级别结转历史:`);
      userHistory.forEach(history => {
        console.log(`- ${history.period}: ${history.type === 'SURPLUS' ? '+' : '-'}${history.amount}`);
      });
    }
    
    // 4. 检查当前预算的rolloverAmount字段
    console.log('\n=== 检查预算的rolloverAmount字段 ===');
    for (const budget of budgets) {
      console.log(`预算 ${budget.name}:`);
      console.log(`  - 基础金额: ${budget.amount}`);
      console.log(`  - 结转金额: ${budget.rolloverAmount || 0}`);
      console.log(`  - 总可用金额: ${Number(budget.amount) + Number(budget.rolloverAmount || 0)}`);
      
      // 计算实际已使用金额
      const spent = await prisma.transaction.aggregate({
        where: {
          accountBookId: budget.accountBookId,
          userId: budget.userId,
          type: 'EXPENSE',
          date: {
            gte: budget.startDate,
            lte: budget.endDate
          }
        },
        _sum: {
          amount: true
        }
      });
      
      const spentAmount = spent._sum.amount ? Number(spent._sum.amount) : 0;
      const totalBudget = Number(budget.amount) + Number(budget.rolloverAmount || 0);
      const actualRemaining = totalBudget - spentAmount;
      
      console.log(`  - 已使用: ${spentAmount}`);
      console.log(`  - 实际剩余: ${actualRemaining}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRolloverHistory();
