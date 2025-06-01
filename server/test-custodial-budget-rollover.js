const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCustodialBudgetRollover() {
  try {
    console.log('=== 测试托管成员预算自动创建和结转 ===');
    
    // 1. 查看当前托管成员的预算状态
    console.log('\n1. 当前托管成员预算状态');
    
    const custodialBudgets = await prisma.budget.findMany({
      where: {
        familyMemberId: { not: null }
      },
      include: {
        familyMember: {
          select: { id: true, name: true, isCustodial: true }
        },
        user: {
          select: { id: true, name: true }
        },
        accountBook: {
          select: { id: true, name: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });
    
    console.log(`找到 ${custodialBudgets.length} 个托管成员预算`);
    
    for (const budget of custodialBudgets) {
      const startDate = new Date(budget.startDate);
      const endDate = new Date(budget.endDate);
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1;
      
      console.log(`\n托管成员: ${budget.familyMember?.name}`);
      console.log(`  时间: ${year}年${month}月`);
      console.log(`  金额: ${budget.amount}`);
      console.log(`  结转: ${budget.rollover ? '是' : '否'}`);
      console.log(`  结转金额: ${budget.rolloverAmount || 0}`);
      console.log(`  账本: ${budget.accountBook?.name}`);
      console.log(`  管理员: ${budget.user?.name}`);
      console.log(`  预算ID: ${budget.id}`);
      
      // 计算实际使用情况
      const spentResult = await prisma.transaction.aggregate({
        where: {
          familyMemberId: budget.familyMemberId,
          accountBookId: budget.accountBookId,
          type: 'EXPENSE',
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: { amount: true }
      });
      
      const spent = spentResult._sum.amount ? Number(spentResult._sum.amount) : 0;
      const totalAvailable = Number(budget.amount) + Number(budget.rolloverAmount || 0);
      const remaining = totalAvailable - spent;
      
      console.log(`  总可用: ${totalAvailable}`);
      console.log(`  已支出: ${spent}`);
      console.log(`  剩余: ${remaining}`);
    }
    
    // 2. 检查是否需要创建6月份的托管成员预算
    console.log('\n2. 检查6月份托管成员预算');
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    console.log(`当前时间: ${currentYear}年${currentMonth}月`);
    
    // 查找所有托管成员
    const custodialMembers = await prisma.familyMember.findMany({
      where: {
        isCustodial: true
      },
      include: {
        family: {
          include: {
            accountBooks: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });
    
    console.log(`找到 ${custodialMembers.length} 个托管成员`);
    
    for (const member of custodialMembers) {
      console.log(`\n检查托管成员: ${member.name}`);
      
      if (member.family?.accountBooks) {
        for (const accountBook of member.family.accountBooks) {
          console.log(`  账本: ${accountBook.name}`);
          
          // 查找该托管成员在当前月份的预算
          const currentMonthBudget = await prisma.budget.findFirst({
            where: {
              familyMemberId: member.id,
              accountBookId: accountBook.id,
              startDate: {
                gte: new Date(currentYear, currentMonth - 1, 1),
                lt: new Date(currentYear, currentMonth, 1)
              }
            }
          });
          
          if (currentMonthBudget) {
            console.log(`    ✓ ${currentYear}年${currentMonth}月预算已存在`);
          } else {
            console.log(`    ⚠️ ${currentYear}年${currentMonth}月预算不存在`);
            
            // 查找最新的预算
            const latestBudget = await prisma.budget.findFirst({
              where: {
                familyMemberId: member.id,
                accountBookId: accountBook.id
              },
              orderBy: { startDate: 'desc' }
            });
            
            if (latestBudget) {
              const latestStartDate = new Date(latestBudget.startDate);
              const latestYear = latestStartDate.getFullYear();
              const latestMonth = latestStartDate.getMonth() + 1;
              
              console.log(`    最新预算: ${latestYear}年${latestMonth}月`);
              console.log(`    金额: ${latestBudget.amount}`);
              console.log(`    结转: ${latestBudget.rollover ? '是' : '否'}`);
              
              if (latestBudget.rollover) {
                // 计算上个月的剩余金额
                const spentResult = await prisma.transaction.aggregate({
                  where: {
                    familyMemberId: member.id,
                    accountBookId: accountBook.id,
                    type: 'EXPENSE',
                    date: {
                      gte: latestBudget.startDate,
                      lte: latestBudget.endDate
                    }
                  },
                  _sum: { amount: true }
                });
                
                const spent = spentResult._sum.amount ? Number(spentResult._sum.amount) : 0;
                const totalAvailable = Number(latestBudget.amount) + Number(latestBudget.rolloverAmount || 0);
                const remaining = totalAvailable - spent;
                
                console.log(`    上月剩余: ${remaining} (应该结转到新月份)`);
              }
              
              console.log(`    建议: 需要创建${currentYear}年${currentMonth}月的托管成员预算`);
            } else {
              console.log(`    未找到任何历史预算`);
            }
          }
        }
      }
    }
    
    // 3. 测试预算自动创建逻辑
    console.log('\n3. 测试预算自动创建逻辑');
    
    // 这里我们不实际创建，只是检查逻辑
    console.log('注意: 这里只是检查逻辑，不会实际创建预算');
    
    // 查看预算服务中的自动创建方法
    console.log('\n检查预算自动创建的触发条件:');
    console.log('- 当用户访问预算页面时');
    console.log('- 当添加交易时');
    console.log('- 定时任务触发时');
    
    // 4. 检查托管成员预算的结转设置
    console.log('\n4. 检查托管成员预算的结转设置');
    
    const custodialBudgetsWithRollover = await prisma.budget.findMany({
      where: {
        familyMemberId: { not: null },
        rollover: true
      },
      include: {
        familyMember: {
          select: { name: true }
        }
      }
    });
    
    console.log(`启用结转的托管成员预算数量: ${custodialBudgetsWithRollover.length}`);
    
    custodialBudgetsWithRollover.forEach(budget => {
      const startDate = new Date(budget.startDate);
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1;
      
      console.log(`  ${budget.familyMember?.name} - ${year}年${month}月: ${budget.amount}元 (结转: ${budget.rolloverAmount || 0}元)`);
    });
    
    if (custodialBudgetsWithRollover.length === 0) {
      console.log('⚠️ 没有托管成员预算启用了结转功能');
      console.log('建议: 为托管成员预算启用结转功能，以便自动结转剩余金额');
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCustodialBudgetRollover();
