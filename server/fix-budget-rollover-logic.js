const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixBudgetRolloverLogic() {
  try {
    console.log('=== 修复预算结转逻辑 ===');
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript月份从0开始
    
    console.log(`当前时间: ${currentYear}年${currentMonth}月`);
    
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
    
    // 2. 按用户/托管成员分组预算
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
    
    console.log(`\n按成员分组后有 ${Object.keys(budgetGroups).length} 个成员的预算需要处理`);
    
    // 3. 为每个成员重新计算结转历史
    for (const [groupKey, group] of Object.entries(budgetGroups)) {
      console.log(`\n=== 处理 ${group.memberName} 的预算 ===`);
      console.log(`预算数量: ${group.budgets.length}`);
      
      // 按时间排序预算
      const sortedBudgets = group.budgets.sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      
      // 清除该成员的所有结转历史记录
      for (const budget of sortedBudgets) {
        await prisma.budgetHistory.deleteMany({
          where: { budgetId: budget.id }
        });
      }
      console.log(`已清除 ${group.memberName} 的所有结转历史记录`);
      
      // 重新计算每个月的结转
      let cumulativeRollover = 0;
      
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
        
        // 计算该月的总可用预算（基础预算 + 上月结转）
        const totalAvailable = budgetAmount + cumulativeRollover;
        
        // 计算该月结转金额
        const monthlyRollover = totalAvailable - spent;
        
        console.log(`  基础预算: ${budgetAmount}`);
        console.log(`  上月结转: ${cumulativeRollover}`);
        console.log(`  总可用: ${totalAvailable}`);
        console.log(`  已支出: ${spent}`);
        console.log(`  本月结转: ${monthlyRollover}`);
        
        // 只有当前月份之前的月份才记录结转历史
        const isCurrentMonth = budgetYear === currentYear && budgetMonth === currentMonth;
        
        if (!isCurrentMonth) {
          // 记录结转历史
          await prisma.budgetHistory.create({
            data: {
              budgetId: budget.id,
              period: `${budgetYear}年${budgetMonth}月`,
              amount: Math.abs(monthlyRollover),
              type: monthlyRollover >= 0 ? 'SURPLUS' : 'DEFICIT',
              description: `${budgetYear}年${budgetMonth}月预算结转`,
              budgetAmount: budgetAmount,
              spentAmount: spent,
              previousRollover: cumulativeRollover,
              userId: budget.userId,
              accountBookId: budget.accountBookId,
              budgetType: budget.budgetType || 'PERSONAL'
            }
          });
          
          console.log(`  ✓ 已记录结转历史: ${monthlyRollover >= 0 ? '+' : ''}${monthlyRollover}`);
          
          // 更新累计结转金额
          cumulativeRollover = monthlyRollover;
        } else {
          console.log(`  ⚠️ 当前月份，不记录结转历史`);
        }
        
        // 更新预算的rolloverAmount字段
        await prisma.budget.update({
          where: { id: budget.id },
          data: { rolloverAmount: cumulativeRollover }
        });
        
        console.log(`  ✓ 已更新预算rolloverAmount: ${cumulativeRollover}`);
      }
      
      console.log(`✓ ${group.memberName} 的预算结转逻辑修复完成`);
    }
    
    console.log('\n=== 验证修复结果 ===');
    
    // 4. 验证修复结果
    const updatedBudgets = await prisma.budget.findMany({
      where: { rollover: true },
      include: {
        user: { select: { name: true } },
        familyMember: { select: { name: true, isCustodial: true } }
      }
    });
    
    for (const budget of updatedBudgets) {
      const memberName = budget.familyMemberId 
        ? budget.familyMember?.name 
        : budget.user?.name;
      
      const budgetStartDate = new Date(budget.startDate);
      const budgetYear = budgetStartDate.getFullYear();
      const budgetMonth = budgetStartDate.getMonth() + 1;
      
      console.log(`\n${memberName} - ${budgetYear}年${budgetMonth}月:`);
      console.log(`  基础预算: ${budget.amount}`);
      console.log(`  结转金额: ${budget.rolloverAmount || 0}`);
      console.log(`  总可用: ${Number(budget.amount) + Number(budget.rolloverAmount || 0)}`);
    }
    
    console.log('\n✓ 预算结转逻辑修复完成！');
    
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBudgetRolloverLogic();
