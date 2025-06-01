const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixFinalRollover() {
  try {
    console.log('=== 最终修复预算结转和清理异常预算 ===');
    
    // 1. 修正6月份的结转金额
    console.log('\n1. 修正6月份结转金额');
    
    const mayBudgetId = 'a5849912-884d-4849-81cb-b738a59407a9'; // 5月预算
    const juneBudgetId = '20c3e6b4-e40b-4317-9f59-d24112e09353'; // 6月预算
    
    // 获取5月预算的实际剩余金额
    const mayBudget = await prisma.budget.findUnique({
      where: { id: mayBudgetId }
    });
    
    if (mayBudget) {
      // 计算5月的实际支出
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
      
      console.log(`5月预算情况:`);
      console.log(`  基础金额: ${mayBudget.amount}`);
      console.log(`  上月结转: ${mayBudget.rolloverAmount || 0}`);
      console.log(`  总可用: ${mayTotalAvailable}`);
      console.log(`  已支出: ${maySpent}`);
      console.log(`  实际剩余: ${mayRemaining}`);
      
      // 更新6月预算的结转金额
      const juneBudget = await prisma.budget.findUnique({
        where: { id: juneBudgetId }
      });
      
      if (juneBudget) {
        console.log(`\n6月预算当前结转金额: ${juneBudget.rolloverAmount || 0}`);
        console.log(`应该修正为: ${mayRemaining}`);
        
        if (Math.abs(Number(juneBudget.rolloverAmount || 0) - mayRemaining) > 0.01) {
          await prisma.budget.update({
            where: { id: juneBudgetId },
            data: { rolloverAmount: mayRemaining }
          });
          
          console.log(`✓ 已更新6月预算结转金额: ${juneBudget.rolloverAmount || 0} → ${mayRemaining}`);
        } else {
          console.log(`✓ 6月预算结转金额已经正确`);
        }
      }
    }
    
    // 2. 清理异常预算记录
    console.log('\n2. 清理异常预算记录');
    
    const abnormalBudgetIds = [
      '34e54c61-527d-42dd-8a36-20057f7d090b', // 5月异常预算
      '76307d31-368f-4c1f-890b-6023782d9aa2'  // 6月异常预算
    ];
    
    for (const budgetId of abnormalBudgetIds) {
      const budget = await prisma.budget.findUnique({
        where: { id: budgetId },
        include: {
          accountBook: {
            select: { name: true }
          }
        }
      });
      
      if (budget) {
        const startDate = new Date(budget.startDate);
        const year = startDate.getFullYear();
        const month = startDate.getMonth() + 1;
        
        console.log(`\n检查异常预算: ${year}年${month}月`);
        console.log(`  预算ID: ${budgetId}`);
        console.log(`  账本: ${budget.accountBook?.name}`);
        console.log(`  金额: ${budget.amount}`);
        console.log(`  结转: ${budget.rollover ? '是' : '否'}`);
        
        // 检查是否有相关交易
        const transactionCount = await prisma.transaction.count({
          where: {
            userId: budget.userId,
            accountBookId: budget.accountBookId,
            date: {
              gte: budget.startDate,
              lte: budget.endDate
            }
          }
        });
        
        console.log(`  相关交易数量: ${transactionCount}`);
        
        // 如果金额为0且没有相关交易，可以安全删除
        if (Number(budget.amount) === 0 && transactionCount === 0) {
          console.log(`  ⚠️ 这是一个空预算，建议删除`);
          
          // 删除预算
          await prisma.budget.delete({
            where: { id: budgetId }
          });
          
          console.log(`  ✓ 已删除异常预算 ${budgetId}`);
        } else {
          console.log(`  ⚠️ 预算有数据，不建议删除`);
        }
      } else {
        console.log(`预算 ${budgetId} 不存在或已删除`);
      }
    }
    
    // 3. 验证最终结果
    console.log('\n3. 验证最终结果');
    
    const finalBudgets = await prisma.budget.findMany({
      where: {
        userId: 'bc5b8f6e-332f-4bca-8044-59fc475d3096'
      },
      include: {
        familyMember: {
          select: { name: true, isCustodial: true }
        },
        accountBook: {
          select: { name: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });
    
    console.log(`\n最终预算记录 (${finalBudgets.length}个):`);
    
    for (const budget of finalBudgets) {
      const startDate = new Date(budget.startDate);
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1;
      
      const memberInfo = budget.familyMemberId 
        ? `托管成员: ${budget.familyMember?.name}` 
        : '个人预算';
      
      console.log(`\n${year}年${month}月 - ${memberInfo}`);
      console.log(`  账本: ${budget.accountBook?.name}`);
      console.log(`  金额: ${budget.amount}`);
      console.log(`  结转: ${budget.rollover ? '是' : '否'}`);
      console.log(`  结转金额: ${budget.rolloverAmount || 0}`);
      
      // 计算实际使用情况
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
      } else {
        whereCondition.userId = budget.userId;
      }
      
      const spentResult = await prisma.transaction.aggregate({
        where: whereCondition,
        _sum: { amount: true }
      });
      
      const spent = spentResult._sum.amount ? Number(spentResult._sum.amount) : 0;
      const totalAvailable = Number(budget.amount) + Number(budget.rolloverAmount || 0);
      const remaining = totalAvailable - spent;
      
      console.log(`  总可用: ${totalAvailable}`);
      console.log(`  已支出: ${spent}`);
      console.log(`  剩余: ${remaining}`);
    }
    
    console.log('\n✅ 预算结转修复和清理完成！');
    
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixFinalRollover();
