const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixJuneRollover() {
  try {
    console.log('=== 修复6月份预算结转金额 ===');
    
    // 1. 查找所有启用结转的预算，按时间排序
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
    
    // 2. 按用户/托管成员分组预算
    const budgetGroups = {};
    
    for (const budget of budgets) {
      let groupKey;
      let memberName;
      
      if (budget.familyMemberId) {
        groupKey = `custodial_${budget.familyMemberId}`;
        memberName = budget.familyMember?.name || '未知托管成员';
      } else {
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
    
    // 3. 为每个成员重新计算正确的结转链
    for (const [groupKey, group] of Object.entries(budgetGroups)) {
      console.log(`\n=== 处理 ${group.memberName} 的预算结转链 ===`);
      
      // 按时间排序预算
      const sortedBudgets = group.budgets.sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      
      console.log(`预算数量: ${sortedBudgets.length}`);
      
      // 逐个计算正确的结转金额
      for (let i = 0; i < sortedBudgets.length; i++) {
        const budget = sortedBudgets[i];
        const budgetStartDate = new Date(budget.startDate);
        const budgetEndDate = new Date(budget.endDate);
        const budgetYear = budgetStartDate.getFullYear();
        const budgetMonth = budgetStartDate.getMonth() + 1;
        
        console.log(`\n处理 ${budgetYear}年${budgetMonth}月 预算 (${budget.id})`);
        
        // 计算该月的实际支出
        const whereCondition = {
          type: 'EXPENSE',
          date: {
            gte: budgetStartDate,
            lte: budgetEndDate
          },
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
        const budgetAmount = Number(budget.amount);
        
        // 计算正确的上月结转金额
        let correctRolloverAmount = 0;
        
        if (i > 0) {
          // 不是第一个月，需要从上个月计算结转
          const previousBudget = sortedBudgets[i - 1];
          const prevBudgetStartDate = new Date(previousBudget.startDate);
          const prevBudgetEndDate = new Date(previousBudget.endDate);
          
          // 计算上个月的支出
          const prevWhereCondition = {
            type: 'EXPENSE',
            date: {
              gte: prevBudgetStartDate,
              lte: prevBudgetEndDate
            },
            accountBookId: previousBudget.accountBookId
          };
          
          if (previousBudget.familyMemberId) {
            prevWhereCondition.familyMemberId = previousBudget.familyMemberId;
          } else if (previousBudget.userId) {
            prevWhereCondition.userId = previousBudget.userId;
          }
          
          const prevSpentResult = await prisma.transaction.aggregate({
            where: prevWhereCondition,
            _sum: { amount: true }
          });
          
          const prevSpent = prevSpentResult._sum.amount ? Number(prevSpentResult._sum.amount) : 0;
          const prevBudgetAmount = Number(previousBudget.amount);
          const prevRolloverAmount = Number(previousBudget.rolloverAmount || 0);
          
          // 上个月的剩余金额就是这个月的结转金额
          const prevTotalAvailable = prevBudgetAmount + prevRolloverAmount;
          correctRolloverAmount = prevTotalAvailable - prevSpent;
          
          console.log(`  上个月情况: 基础=${prevBudgetAmount}, 结转=${prevRolloverAmount}, 支出=${prevSpent}, 剩余=${correctRolloverAmount}`);
        }
        
        // 计算当前月的情况
        const currentRolloverAmount = Number(budget.rolloverAmount || 0);
        const totalAvailable = budgetAmount + correctRolloverAmount;
        const remaining = totalAvailable - spent;
        
        console.log(`  当前月情况:`);
        console.log(`    基础预算: ${budgetAmount}`);
        console.log(`    当前结转: ${currentRolloverAmount}`);
        console.log(`    正确结转: ${correctRolloverAmount}`);
        console.log(`    已支出: ${spent}`);
        console.log(`    剩余: ${remaining}`);
        
        // 如果结转金额不正确，更新它
        if (Math.abs(currentRolloverAmount - correctRolloverAmount) > 0.01) {
          await prisma.budget.update({
            where: { id: budget.id },
            data: { rolloverAmount: correctRolloverAmount }
          });
          
          console.log(`  ✓ 已更新结转金额: ${currentRolloverAmount} → ${correctRolloverAmount}`);
        } else {
          console.log(`  ✓ 结转金额正确，无需更新`);
        }
      }
      
      console.log(`✓ ${group.memberName} 的预算结转链修复完成`);
    }
    
    console.log('\n=== 验证修复结果 ===');
    
    // 4. 验证修复结果
    const updatedBudgets = await prisma.budget.findMany({
      where: { rollover: true },
      include: {
        user: { select: { name: true } },
        familyMember: { select: { name: true, isCustodial: true } }
      },
      orderBy: { startDate: 'asc' }
    });
    
    for (const budget of updatedBudgets) {
      const memberName = budget.familyMemberId 
        ? budget.familyMember?.name 
        : budget.user?.name;
      
      const budgetStartDate = new Date(budget.startDate);
      const budgetYear = budgetStartDate.getFullYear();
      const budgetMonth = budgetStartDate.getMonth() + 1;
      
      // 计算实际支出
      const whereCondition = {
        type: 'EXPENSE',
        date: {
          gte: budget.startDate,
          lte: budget.endDate
        },
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
      
      console.log(`\n${memberName} - ${budgetYear}年${budgetMonth}月:`);
      console.log(`  基础预算: ${budget.amount}`);
      console.log(`  上月结转: ${budget.rolloverAmount || 0}`);
      console.log(`  总可用: ${totalAvailable}`);
      console.log(`  已支出: ${spent}`);
      console.log(`  剩余: ${remaining}`);
    }
    
    console.log('\n✓ 6月份预算结转金额修复完成！');
    
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixJuneRollover();
