const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyCurrentRollover() {
  try {
    console.log('=== 验证当前结转状态 ===');
    
    // 查找启用结转的预算（只看主账本的）
    const rolloverBudgets = await prisma.budget.findMany({
      where: {
        userId: 'bc5b8f6e-332f-4bca-8044-59fc475d3096',
        accountBookId: '5f4868cc-2a61-40a9-ab1d-9112bc19c838', // 主账本
        rollover: true
      },
      orderBy: { startDate: 'asc' }
    });
    
    console.log(`找到 ${rolloverBudgets.length} 个启用结转的预算（主账本）`);
    
    for (let i = 0; i < rolloverBudgets.length; i++) {
      const budget = rolloverBudgets[i];
      const startDate = new Date(budget.startDate);
      const endDate = new Date(budget.endDate);
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1;
      
      console.log(`\n=== ${year}年${month}月预算验证 ===`);
      console.log(`预算ID: ${budget.id}`);
      console.log(`基础金额: ${budget.amount}`);
      console.log(`当前结转金额: ${budget.rolloverAmount || 0}`);
      
      // 计算实际支出
      const spentResult = await prisma.transaction.aggregate({
        where: {
          userId: budget.userId,
          accountBookId: budget.accountBookId,
          type: 'EXPENSE',
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: { amount: true }
      });
      
      const actualSpent = spentResult._sum.amount ? Number(spentResult._sum.amount) : 0;
      console.log(`实际支出: ${actualSpent}`);
      
      // 计算应该的结转金额
      let shouldRolloverAmount = 0;
      
      if (i > 0) {
        // 不是第一个月，应该从上个月计算结转
        const prevBudget = rolloverBudgets[i - 1];
        const prevStartDate = new Date(prevBudget.startDate);
        const prevEndDate = new Date(prevBudget.endDate);
        
        // 计算上个月的实际支出
        const prevSpentResult = await prisma.transaction.aggregate({
          where: {
            userId: prevBudget.userId,
            accountBookId: prevBudget.accountBookId,
            type: 'EXPENSE',
            date: {
              gte: prevStartDate,
              lte: prevEndDate
            }
          },
          _sum: { amount: true }
        });
        
        const prevActualSpent = prevSpentResult._sum.amount ? Number(prevSpentResult._sum.amount) : 0;
        const prevTotalAvailable = Number(prevBudget.amount) + Number(prevBudget.rolloverAmount || 0);
        shouldRolloverAmount = prevTotalAvailable - prevActualSpent;
        
        console.log(`上个月情况:`);
        console.log(`  基础: ${prevBudget.amount}`);
        console.log(`  结转: ${prevBudget.rolloverAmount || 0}`);
        console.log(`  总可用: ${prevTotalAvailable}`);
        console.log(`  实际支出: ${prevActualSpent}`);
        console.log(`  应该结转: ${shouldRolloverAmount}`);
      }
      
      console.log(`应该的结转金额: ${shouldRolloverAmount}`);
      console.log(`当前的结转金额: ${budget.rolloverAmount || 0}`);
      
      const totalAvailable = Number(budget.amount) + Number(budget.rolloverAmount || 0);
      const remaining = totalAvailable - actualSpent;
      
      console.log(`当前月总可用: ${totalAvailable}`);
      console.log(`当前月剩余: ${remaining}`);
      
      // 检查是否需要修正
      if (Math.abs(Number(budget.rolloverAmount || 0) - shouldRolloverAmount) > 0.01) {
        console.log(`⚠️ 结转金额不正确，应该修正为: ${shouldRolloverAmount}`);
      } else {
        console.log(`✓ 结转金额正确`);
      }
    }
    
    // 手动验证5月到6月的结转
    console.log('\n=== 手动验证5月到6月的结转 ===');
    
    const mayBudget = rolloverBudgets.find(b => {
      const startDate = new Date(b.startDate);
      return startDate.getMonth() === 4; // 5月（JavaScript月份从0开始）
    });
    
    const juneBudget = rolloverBudgets.find(b => {
      const startDate = new Date(b.startDate);
      return startDate.getMonth() === 5; // 6月
    });
    
    if (mayBudget && juneBudget) {
      console.log('\n5月预算:');
      console.log(`  基础: ${mayBudget.amount}`);
      console.log(`  结转: ${mayBudget.rolloverAmount || 0}`);
      
      // 重新计算5月支出
      const maySpentResult = await prisma.transaction.aggregate({
        where: {
          userId: mayBudget.userId,
          accountBookId: mayBudget.accountBookId,
          type: 'EXPENSE',
          date: {
            gte: mayBudget.startDate,
            lte: mayBudget.endDate
          }
        },
        _sum: { amount: true }
      });
      
      const maySpent = maySpentResult._sum.amount ? Number(maySpentResult._sum.amount) : 0;
      const mayTotalAvailable = Number(mayBudget.amount) + Number(mayBudget.rolloverAmount || 0);
      const mayRemaining = mayTotalAvailable - maySpent;
      
      console.log(`  支出: ${maySpent}`);
      console.log(`  总可用: ${mayTotalAvailable}`);
      console.log(`  剩余: ${mayRemaining}`);
      
      console.log('\n6月预算:');
      console.log(`  基础: ${juneBudget.amount}`);
      console.log(`  当前结转: ${juneBudget.rolloverAmount || 0}`);
      console.log(`  应该结转: ${mayRemaining}`);
      
      if (Math.abs(Number(juneBudget.rolloverAmount || 0) - mayRemaining) > 0.01) {
        console.log(`⚠️ 6月结转金额不正确！应该是 ${mayRemaining}，当前是 ${juneBudget.rolloverAmount || 0}`);
        
        // 提供修正建议
        console.log('\n修正建议:');
        console.log(`UPDATE budget SET rolloverAmount = ${mayRemaining} WHERE id = '${juneBudget.id}';`);
      } else {
        console.log(`✓ 6月结转金额正确`);
      }
    }
    
  } catch (error) {
    console.error('验证失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCurrentRollover();
