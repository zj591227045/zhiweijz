const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNewRolloverLogic() {
  try {
    console.log('=== 测试新的预算结转逻辑 ===');
    
    // 1. 查找所有启用结转的预算
    const budgets = await prisma.budget.findMany({
      where: {
        rollover: true
      },
      include: {
        user: {
          select: { id: true, name: true }
        },
        familyMember: {
          select: { id: true, name: true, isCustodial: true }
        }
      },
      orderBy: [
        { userId: 'asc' },
        { familyMemberId: 'asc' },
        { startDate: 'asc' }
      ]
    });
    
    console.log(`找到 ${budgets.length} 个启用结转的预算`);
    
    // 2. 按用户/托管成员分组显示预算
    const budgetGroups = {};
    
    for (const budget of budgets) {
      let groupKey;
      let memberName;
      
      if (budget.familyMemberId) {
        // 托管成员预算
        groupKey = `custodial_${budget.familyMemberId}`;
        memberName = budget.familyMember?.name || '未知托管成员';
      } else {
        // 普通用户预算
        groupKey = `user_${budget.userId}`;
        memberName = budget.user?.name || '未知用户';
      }
      
      if (!budgetGroups[groupKey]) {
        budgetGroups[groupKey] = {
          memberName,
          budgets: [],
          isCustodial: !!budget.familyMemberId
        };
      }
      
      budgetGroups[groupKey].budgets.push(budget);
    }
    
    console.log(`\n按成员分组后有 ${Object.keys(budgetGroups).length} 个成员的预算`);
    
    // 3. 显示每个成员的预算结转情况
    for (const [groupKey, group] of Object.entries(budgetGroups)) {
      console.log(`\n=== ${group.memberName} 的预算结转情况 ===`);
      
      // 按时间排序预算
      const sortedBudgets = group.budgets.sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      
      for (const budget of sortedBudgets) {
        const budgetStartDate = new Date(budget.startDate);
        const budgetEndDate = new Date(budget.endDate);
        const budgetYear = budgetStartDate.getFullYear();
        const budgetMonth = budgetStartDate.getMonth() + 1;
        
        // 计算该月的实际支出
        const whereCondition = {
          type: 'EXPENSE',
          date: {
            gte: budgetStartDate,
            lte: budgetEndDate
          },
          accountBookId: budget.accountBookId
        };
        
        // 根据预算类型添加过滤条件
        if (budget.familyMemberId) {
          whereCondition.familyMemberId = budget.familyMemberId;
        } else if (budget.userId) {
          whereCondition.userId = budget.userId;
        }
        
        const spentResult = await prisma.transaction.aggregate({
          where: whereCondition,
          _sum: { amount: true }
        });
        
        const spent = spentResult._sum.amount ? Number(spentResult._sum.amount) : 0;
        const budgetAmount = Number(budget.amount);
        const rolloverAmount = Number(budget.rolloverAmount || 0);
        const totalAvailable = budgetAmount + rolloverAmount;
        const remaining = totalAvailable - spent;
        
        console.log(`${budgetYear}年${budgetMonth}月:`);
        console.log(`  基础预算: ${budgetAmount}`);
        console.log(`  上月结转: ${rolloverAmount}`);
        console.log(`  总可用: ${totalAvailable}`);
        console.log(`  已支出: ${spent}`);
        console.log(`  剩余: ${remaining}`);
        console.log(`  预算ID: ${budget.id}`);
      }
    }
    
    // 4. 测试基于预算记录的结转历史查询
    console.log('\n=== 测试基于预算记录的结转历史查询 ===');
    
    if (budgets.length > 0) {
      const testBudget = budgets[0];
      const memberName = testBudget.familyMemberId 
        ? testBudget.familyMember?.name 
        : testBudget.user?.name;
      
      console.log(`测试用户: ${memberName}`);
      
      // 构建查询条件
      const whereCondition = {
        accountBookId: testBudget.accountBookId,
        budgetType: testBudget.budgetType || 'PERSONAL',
        rollover: true,
      };
      
      // 根据是否为托管成员添加不同的过滤条件
      if (testBudget.familyMemberId) {
        whereCondition.familyMemberId = testBudget.familyMemberId;
      } else {
        whereCondition.userId = testBudget.userId;
        whereCondition.familyMemberId = null;
      }
      
      // 查询历史预算记录
      const historicalBudgets = await prisma.budget.findMany({
        where: whereCondition,
        orderBy: { startDate: 'desc' },
        take: 10
      });
      
      console.log(`找到 ${historicalBudgets.length} 个历史预算记录`);
      
      // 转换为结转历史格式
      const rolloverHistory = [];
      const currentDate = new Date();
      
      for (const budget of historicalBudgets) {
        const startDate = new Date(budget.startDate);
        const endDate = new Date(budget.endDate);
        const year = startDate.getFullYear();
        const month = startDate.getMonth() + 1;
        const period = `${year}年${month}月`;
        
        // 只有已结束的月份才显示结转记录
        if (endDate < currentDate) {
          // 计算该月的实际支出
          const whereCondition = {
            type: 'EXPENSE',
            date: { gte: startDate, lte: endDate },
            accountBookId: budget.accountBookId
          };
          
          if (budget.familyMemberId) {
            whereCondition.familyMemberId = budget.familyMemberId;
          } else if (budget.userId) {
            whereCondition.userId = budget.userId;
          }
          
          const spentResult = await prisma.transaction.aggregate({
            where: whereCondition,
            _sum: { amount: true }
          });
          
          const spent = spentResult._sum.amount ? Number(spentResult._sum.amount) : 0;
          const totalAvailable = Number(budget.amount) + Number(budget.rolloverAmount || 0);
          const remaining = totalAvailable - spent;
          
          rolloverHistory.push({
            period,
            amount: Math.abs(remaining),
            type: remaining >= 0 ? 'SURPLUS' : 'DEFICIT',
            budgetAmount: Number(budget.amount),
            spentAmount: spent,
            previousRollover: Number(budget.rolloverAmount || 0)
          });
        }
      }
      
      console.log(`生成的结转历史记录:`);
      rolloverHistory.forEach(record => {
        console.log(`  ${record.period}: ${record.type === 'SURPLUS' ? '+' : '-'}${record.amount} (基础: ${record.budgetAmount}, 上月结转: ${record.previousRollover}, 支出: ${record.spentAmount})`);
      });
    }
    
    console.log('\n✓ 新的预算结转逻辑测试完成！');
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewRolloverLogic();
