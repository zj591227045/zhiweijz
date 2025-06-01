const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixRolloverAmounts() {
  try {
    console.log('=== 修复预算结转金额 ===');
    
    // 1. 查找所有启用结转的预算
    const budgets = await prisma.budget.findMany({
      where: {
        rollover: true
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });
    
    console.log(`找到 ${budgets.length} 个启用结转的预算`);
    
    for (const budget of budgets) {
      console.log(`\n处理预算: ${budget.name} (ID: ${budget.id})`);
      
      // 2. 获取该预算最新的结转历史记录
      const latestRollover = await prisma.budgetHistory.findFirst({
        where: {
          budgetId: budget.id
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      if (latestRollover) {
        // 计算结转金额（SURPLUS为正，DEFICIT为负）
        const rolloverAmount = latestRollover.type === 'SURPLUS' 
          ? Number(latestRollover.amount) 
          : -Number(latestRollover.amount);
        
        console.log(`  - 最新结转记录: ${latestRollover.period} ${latestRollover.type === 'SURPLUS' ? '+' : '-'}${latestRollover.amount}`);
        console.log(`  - 当前rolloverAmount: ${budget.rolloverAmount || 0}`);
        console.log(`  - 应该设置为: ${rolloverAmount}`);
        
        // 3. 更新预算的rolloverAmount字段
        await prisma.budget.update({
          where: { id: budget.id },
          data: { rolloverAmount: rolloverAmount }
        });
        
        console.log(`  ✓ 已更新rolloverAmount为: ${rolloverAmount}`);
      } else {
        console.log(`  - 未找到结转历史记录，保持rolloverAmount为0`);
      }
    }
    
    console.log('\n=== 验证修复结果 ===');
    
    // 4. 验证修复结果
    const updatedBudgets = await prisma.budget.findMany({
      where: {
        rollover: true
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });
    
    for (const budget of updatedBudgets) {
      console.log(`\n预算 ${budget.name}:`);
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
    }
    
    console.log('\n✓ 预算结转金额修复完成！');
    
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRolloverAmounts();
