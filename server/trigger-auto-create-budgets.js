const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 模拟BudgetService的autoCreateMissingBudgets方法
async function triggerAutoCreateBudgets() {
  try {
    console.log('=== 手动触发预算自动创建逻辑 ===');
    
    const userId = 'bc5b8f6e-332f-4bca-8044-59fc475d3096'; // 张杰
    const accountBookId = '5f4868cc-2a61-40a9-ab1d-9112bc19c838'; // 我们的家家庭账本
    
    console.log(`用户ID: ${userId}`);
    console.log(`账本ID: ${accountBookId}`);
    
    // 1. 检查当前月份的个人预算
    console.log('\n1. 检查个人预算');
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    console.log(`当前时间: ${currentYear}年${currentMonth}月`);
    
    const currentPersonalBudgets = await prisma.budget.findMany({
      where: {
        userId: userId,
        accountBookId: accountBookId,
        familyMemberId: null, // 排除托管成员预算
        startDate: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1)
        }
      }
    });
    
    console.log(`当前月份个人预算数量: ${currentPersonalBudgets.length}`);
    
    if (currentPersonalBudgets.length > 0) {
      console.log('✓ 个人预算已存在');
    } else {
      console.log('⚠️ 个人预算不存在，需要创建');
    }
    
    // 2. 检查托管成员预算
    console.log('\n2. 检查托管成员预算');
    
    // 查找账本关联的家庭
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId },
      include: {
        family: {
          include: {
            members: {
              where: { isCustodial: true }
            }
          }
        }
      }
    });
    
    if (accountBook?.family?.members) {
      console.log(`找到 ${accountBook.family.members.length} 个托管成员`);
      
      for (const member of accountBook.family.members) {
        console.log(`\n检查托管成员: ${member.name}`);
        
        // 查找当前月份的托管成员预算
        const currentCustodialBudgets = await prisma.budget.findMany({
          where: {
            familyMemberId: member.id,
            accountBookId: accountBookId,
            startDate: {
              gte: new Date(currentYear, currentMonth - 1, 1),
              lt: new Date(currentYear, currentMonth, 1)
            }
          }
        });
        
        console.log(`  当前月份预算数量: ${currentCustodialBudgets.length}`);
        
        if (currentCustodialBudgets.length > 0) {
          console.log('  ✓ 托管成员预算已存在');
        } else {
          console.log('  ⚠️ 托管成员预算不存在，需要创建');
          
          // 查找最新的托管成员预算
          const latestCustodialBudget = await prisma.budget.findFirst({
            where: {
              familyMemberId: member.id,
              accountBookId: accountBookId
            },
            orderBy: { startDate: 'desc' }
          });
          
          if (latestCustodialBudget) {
            const latestStartDate = new Date(latestCustodialBudget.startDate);
            const latestEndDate = new Date(latestCustodialBudget.endDate);
            const latestYear = latestStartDate.getFullYear();
            const latestMonth = latestStartDate.getMonth() + 1;
            
            console.log(`  最新预算: ${latestYear}年${latestMonth}月`);
            console.log(`  金额: ${latestCustodialBudget.amount}`);
            console.log(`  结转: ${latestCustodialBudget.rollover ? '是' : '否'}`);
            
            // 检查是否需要创建新的预算周期
            if (latestEndDate < currentDate) {
              console.log(`  ⚠️ 最新预算已过期，需要创建新的预算周期`);
              
              // 计算需要创建的月份数
              const monthsDiff = (currentDate.getFullYear() - latestEndDate.getFullYear()) * 12 + 
                                (currentDate.getMonth() - latestEndDate.getMonth());
              console.log(`  需要创建 ${monthsDiff} 个月的预算`);
              
              // 模拟创建新预算的逻辑
              console.log(`  建议创建预算:`);
              
              for (let i = 1; i <= monthsDiff; i++) {
                const targetDate = new Date(latestEndDate);
                targetDate.setMonth(targetDate.getMonth() + i);
                const targetYear = targetDate.getFullYear();
                const targetMonth = targetDate.getMonth() + 1;
                
                // 计算结转金额
                let rolloverAmount = 0;
                if (latestCustodialBudget.rollover) {
                  // 这里应该计算上个月的剩余金额
                  // 为了简化，我们先使用0
                  rolloverAmount = 0;
                }
                
                console.log(`    ${targetYear}年${targetMonth}月: 基础${latestCustodialBudget.amount}元 + 结转${rolloverAmount}元`);
              }
              
              // 实际创建预算（这里我们先不执行，只是显示逻辑）
              console.log(`  注意: 这里只是显示逻辑，实际创建需要调用BudgetService`);
            } else {
              console.log(`  ✓ 最新预算还在有效期内`);
            }
          } else {
            console.log(`  ⚠️ 没有找到历史预算，无法自动创建`);
          }
        }
      }
    } else {
      console.log('账本不属于家庭或没有托管成员');
    }
    
    // 3. 建议解决方案
    console.log('\n3. 建议解决方案');
    
    console.log('为了确保托管成员预算能够自动创建和结转，建议:');
    console.log('1. 为托管成员的历史预算启用结转功能');
    console.log('2. 手动触发预算自动创建逻辑');
    console.log('3. 确保预算服务在用户访问时自动创建缺失的预算');
    
    // 4. 检查是否需要启用托管成员预算的结转功能
    console.log('\n4. 检查托管成员预算结转设置');
    
    const custodialBudgetsToUpdate = await prisma.budget.findMany({
      where: {
        familyMemberId: { not: null },
        accountBookId: accountBookId,
        rollover: false // 未启用结转的
      },
      include: {
        familyMember: {
          select: { name: true }
        }
      }
    });
    
    if (custodialBudgetsToUpdate.length > 0) {
      console.log(`找到 ${custodialBudgetsToUpdate.length} 个未启用结转的托管成员预算:`);
      
      custodialBudgetsToUpdate.forEach(budget => {
        const startDate = new Date(budget.startDate);
        const year = startDate.getFullYear();
        const month = startDate.getMonth() + 1;
        
        console.log(`  ${budget.familyMember?.name} - ${year}年${month}月: ${budget.amount}元`);
        console.log(`    建议: UPDATE budget SET rollover = true WHERE id = '${budget.id}';`);
      });
    } else {
      console.log('所有托管成员预算都已启用结转功能');
    }
    
  } catch (error) {
    console.error('触发自动创建失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

triggerAutoCreateBudgets();
