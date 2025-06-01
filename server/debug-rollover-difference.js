const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugRolloverDifference() {
  try {
    console.log('=== 调试结转金额差异 ===');
    
    // 查找5月和6月的预算
    const budgets = await prisma.budget.findMany({
      where: {
        rollover: true,
        userId: 'bc5b8f6e-332f-4bca-8044-59fc475d3096' // 张杰的用户ID
      },
      orderBy: { startDate: 'asc' }
    });
    
    console.log(`找到 ${budgets.length} 个预算记录`);
    
    for (const budget of budgets) {
      const startDate = new Date(budget.startDate);
      const endDate = new Date(budget.endDate);
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1;
      
      console.log(`\n=== ${year}年${month}月预算详情 ===`);
      console.log(`预算ID: ${budget.id}`);
      console.log(`开始日期: ${startDate.toLocaleDateString()}`);
      console.log(`结束日期: ${endDate.toLocaleDateString()}`);
      console.log(`基础金额: ${budget.amount}`);
      console.log(`结转金额: ${budget.rolloverAmount || 0}`);
      
      // 查询该月的所有交易
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: budget.userId,
          accountBookId: budget.accountBookId,
          type: 'EXPENSE',
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'asc' }
      });
      
      console.log(`该月交易数量: ${transactions.length}`);
      
      let totalSpent = 0;
      transactions.forEach((tx, index) => {
        totalSpent += Number(tx.amount);
        console.log(`  ${index + 1}. ${tx.date.toLocaleDateString()}: ${tx.description} - ${tx.amount}元`);
      });
      
      console.log(`总支出: ${totalSpent}`);
      
      const totalAvailable = Number(budget.amount) + Number(budget.rolloverAmount || 0);
      const remaining = totalAvailable - totalSpent;
      
      console.log(`总可用: ${totalAvailable}`);
      console.log(`剩余: ${remaining}`);
    }
    
    // 检查是否有其他相关的预算记录
    console.log('\n=== 检查是否有其他相关预算 ===');
    
    const allUserBudgets = await prisma.budget.findMany({
      where: {
        userId: 'bc5b8f6e-332f-4bca-8044-59fc475d3096'
      },
      orderBy: { startDate: 'asc' }
    });
    
    console.log(`用户总预算数量: ${allUserBudgets.length}`);
    
    allUserBudgets.forEach(budget => {
      const startDate = new Date(budget.startDate);
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1;
      console.log(`  ${year}年${month}月: ${budget.name} (结转: ${budget.rollover ? '是' : '否'}, 金额: ${budget.rolloverAmount || 0})`);
    });
    
    // 检查是否有4月份的预算（可能影响5月份的结转）
    console.log('\n=== 检查4月份预算 ===');
    
    const aprilBudgets = await prisma.budget.findMany({
      where: {
        userId: 'bc5b8f6e-332f-4bca-8044-59fc475d3096',
        startDate: {
          gte: new Date('2025-04-01'),
          lt: new Date('2025-05-01')
        }
      }
    });
    
    if (aprilBudgets.length > 0) {
      console.log(`找到 ${aprilBudgets.length} 个4月份预算`);
      
      for (const budget of aprilBudgets) {
        console.log(`4月预算: ${budget.name}`);
        console.log(`  基础金额: ${budget.amount}`);
        console.log(`  结转金额: ${budget.rolloverAmount || 0}`);
        console.log(`  启用结转: ${budget.rollover ? '是' : '否'}`);
        
        // 计算4月份的支出
        const aprilSpent = await prisma.transaction.aggregate({
          where: {
            userId: budget.userId,
            accountBookId: budget.accountBookId,
            type: 'EXPENSE',
            date: {
              gte: budget.startDate,
              lte: budget.endDate
            }
          },
          _sum: { amount: true }
        });
        
        const spent = aprilSpent._sum.amount ? Number(aprilSpent._sum.amount) : 0;
        const totalAvailable = Number(budget.amount) + Number(budget.rolloverAmount || 0);
        const remaining = totalAvailable - spent;
        
        console.log(`  已支出: ${spent}`);
        console.log(`  剩余: ${remaining}`);
        console.log(`  这个剩余应该结转到5月份`);
      }
    } else {
      console.log('没有找到4月份预算');
    }
    
  } catch (error) {
    console.error('调试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRolloverDifference();
