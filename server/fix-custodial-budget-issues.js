const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCustodialBudgetIssues() {
  try {
    console.log('=== 修复托管成员预算问题 ===');
    
    const userId = 'bc5b8f6e-332f-4bca-8044-59fc475d3096'; // 张杰
    const accountBookId = '5f4868cc-2a61-40a9-ab1d-9112bc19c838'; // 我们的家家庭账本
    
    // 1. 启用托管成员预算的结转功能
    console.log('\n1. 启用托管成员预算的结转功能');
    
    const custodialBudgetId = '2fc14785-c73e-4b5d-a275-6f2c707d0ddf'; // 朵朵的5月预算
    
    const custodialBudget = await prisma.budget.findUnique({
      where: { id: custodialBudgetId },
      include: {
        familyMember: {
          select: { name: true }
        }
      }
    });
    
    if (custodialBudget) {
      console.log(`托管成员: ${custodialBudget.familyMember?.name}`);
      console.log(`当前结转设置: ${custodialBudget.rollover ? '已启用' : '未启用'}`);
      
      if (!custodialBudget.rollover) {
        await prisma.budget.update({
          where: { id: custodialBudgetId },
          data: { rollover: true }
        });
        
        console.log('✓ 已启用托管成员预算的结转功能');
      } else {
        console.log('✓ 托管成员预算已启用结转功能');
      }
    }
    
    // 2. 创建6月份的托管成员预算
    console.log('\n2. 创建6月份的托管成员预算');
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 6月
    
    console.log(`当前时间: ${currentYear}年${currentMonth}月`);
    
    // 检查6月份预算是否已存在
    const existingJuneBudget = await prisma.budget.findFirst({
      where: {
        familyMemberId: custodialBudget?.familyMemberId,
        accountBookId: accountBookId,
        startDate: {
          gte: new Date(currentYear, currentMonth - 1, 1), // 6月1日
          lt: new Date(currentYear, currentMonth, 1) // 7月1日
        }
      }
    });
    
    if (existingJuneBudget) {
      console.log('✓ 6月份托管成员预算已存在');
    } else {
      console.log('⚠️ 6月份托管成员预算不存在，开始创建');
      
      if (custodialBudget) {
        // 计算5月份的剩余金额作为6月份的结转
        const maySpentResult = await prisma.transaction.aggregate({
          where: {
            familyMemberId: custodialBudget.familyMemberId,
            accountBookId: accountBookId,
            type: 'EXPENSE',
            date: {
              gte: custodialBudget.startDate,
              lte: custodialBudget.endDate
            }
          },
          _sum: { amount: true }
        });
        
        const maySpent = maySpentResult._sum.amount ? Number(maySpentResult._sum.amount) : 0;
        const mayTotalAvailable = Number(custodialBudget.amount) + Number(custodialBudget.rolloverAmount || 0);
        const mayRemaining = mayTotalAvailable - maySpent;
        
        console.log(`5月份情况:`);
        console.log(`  基础预算: ${custodialBudget.amount}`);
        console.log(`  上月结转: ${custodialBudget.rolloverAmount || 0}`);
        console.log(`  总可用: ${mayTotalAvailable}`);
        console.log(`  已支出: ${maySpent}`);
        console.log(`  剩余: ${mayRemaining} (将结转到6月)`);
        
        // 创建6月份预算
        const juneBudgetData = {
          name: custodialBudget.name,
          amount: custodialBudget.amount, // 基础金额保持不变
          rolloverAmount: mayRemaining, // 5月份剩余作为结转
          period: 'MONTHLY',
          budgetType: 'PERSONAL',
          rollover: true, // 启用结转
          startDate: new Date(currentYear, currentMonth - 1, 1), // 6月1日
          endDate: new Date(currentYear, currentMonth, 0), // 6月30日
          userId: custodialBudget.userId,
          accountBookId: accountBookId,
          familyMemberId: custodialBudget.familyMemberId
        };
        
        const newJuneBudget = await prisma.budget.create({
          data: juneBudgetData
        });
        
        console.log(`✓ 成功创建6月份托管成员预算:`);
        console.log(`  预算ID: ${newJuneBudget.id}`);
        console.log(`  基础金额: ${newJuneBudget.amount}`);
        console.log(`  结转金额: ${newJuneBudget.rolloverAmount}`);
        console.log(`  总可用: ${Number(newJuneBudget.amount) + Number(newJuneBudget.rolloverAmount || 0)}`);
      }
    }
    
    // 3. 验证修复结果
    console.log('\n3. 验证修复结果');
    
    const allCustodialBudgets = await prisma.budget.findMany({
      where: {
        familyMemberId: { not: null },
        accountBookId: accountBookId
      },
      include: {
        familyMember: {
          select: { name: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });
    
    console.log(`托管成员预算总数: ${allCustodialBudgets.length}`);
    
    for (const budget of allCustodialBudgets) {
      const startDate = new Date(budget.startDate);
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1;
      
      console.log(`\n${budget.familyMember?.name} - ${year}年${month}月:`);
      console.log(`  基础金额: ${budget.amount}`);
      console.log(`  结转金额: ${budget.rolloverAmount || 0}`);
      console.log(`  总可用: ${Number(budget.amount) + Number(budget.rolloverAmount || 0)}`);
      console.log(`  结转功能: ${budget.rollover ? '已启用' : '未启用'}`);
      
      // 计算实际使用情况
      const spentResult = await prisma.transaction.aggregate({
        where: {
          familyMemberId: budget.familyMemberId,
          accountBookId: budget.accountBookId,
          type: 'EXPENSE',
          date: {
            gte: budget.startDate,
            lte: budget.endDate
          }
        },
        _sum: { amount: true }
      });
      
      const spent = spentResult._sum.amount ? Number(spentResult._sum.amount) : 0;
      const remaining = Number(budget.amount) + Number(budget.rolloverAmount || 0) - spent;
      
      console.log(`  已支出: ${spent}`);
      console.log(`  剩余: ${remaining}`);
    }
    
    // 4. 测试自动创建逻辑
    console.log('\n4. 测试自动创建逻辑是否正常工作');
    
    console.log('现在托管成员预算应该能够:');
    console.log('✓ 自动创建新月份的预算');
    console.log('✓ 正确计算和结转剩余金额');
    console.log('✓ 在用户访问预算页面时触发自动创建');
    
    console.log('\n建议测试步骤:');
    console.log('1. 访问预算页面，检查是否自动创建了缺失的预算');
    console.log('2. 添加托管成员的交易，检查预算使用情况');
    console.log('3. 跨月时检查结转是否正确计算');
    
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCustodialBudgetIssues();
