const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCustodialMembers() {
  try {
    console.log('=== 检查托管成员预算状况 ===');
    
    // 1. 查找所有托管成员
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
    
    if (custodialMembers.length === 0) {
      console.log('没有托管成员，无需检查');
      return;
    }
    
    // 2. 检查每个托管成员的预算状况
    for (const member of custodialMembers) {
      console.log(`\n=== 托管成员: ${member.name} ===`);
      console.log(`家庭ID: ${member.familyId}`);
      
      if (member.family?.accountBooks) {
        for (const accountBook of member.family.accountBooks) {
          console.log(`\n账本: ${accountBook.name} (${accountBook.id})`);
          
          // 查找该托管成员在该账本中的预算
          const budgets = await prisma.budget.findMany({
            where: {
              familyMemberId: member.id,
              accountBookId: accountBook.id
            },
            orderBy: {
              startDate: 'desc'
            }
          });
          
          console.log(`  找到 ${budgets.length} 个预算记录`);
          
          if (budgets.length > 0) {
            const latestBudget = budgets[0];
            const budgetStartDate = new Date(latestBudget.startDate);
            const budgetEndDate = new Date(latestBudget.endDate);
            const currentDate = new Date();
            
            console.log(`  最新预算:`);
            console.log(`    名称: ${latestBudget.name}`);
            console.log(`    金额: ${latestBudget.amount}`);
            console.log(`    开始日期: ${budgetStartDate.toLocaleDateString()}`);
            console.log(`    结束日期: ${budgetEndDate.toLocaleDateString()}`);
            console.log(`    是否启用结转: ${latestBudget.rollover ? '是' : '否'}`);
            console.log(`    结转金额: ${latestBudget.rolloverAmount || 0}`);
            
            // 检查是否需要创建新的预算周期
            if (budgetEndDate < currentDate) {
              console.log(`  ⚠️ 最新预算已过期，需要创建新的预算周期`);
              
              // 计算需要创建的月份数
              const monthsDiff = (currentDate.getFullYear() - budgetEndDate.getFullYear()) * 12 + 
                                (currentDate.getMonth() - budgetEndDate.getMonth());
              console.log(`  需要创建 ${monthsDiff} 个月的预算`);
            } else {
              console.log(`  ✓ 预算是最新的`);
            }
          } else {
            console.log(`  ⚠️ 该托管成员在此账本中没有预算记录`);
          }
        }
      } else {
        console.log('  该托管成员的家庭没有关联账本');
      }
    }
    
    // 3. 检查预算自动创建逻辑
    console.log('\n=== 测试预算自动创建逻辑 ===');
    
    // 查找一个有托管成员的账本
    const accountBookWithFamily = await prisma.accountBook.findFirst({
      where: {
        familyId: { not: null }
      },
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
    
    if (accountBookWithFamily && accountBookWithFamily.family?.members.length > 0) {
      console.log(`测试账本: ${accountBookWithFamily.name}`);
      console.log(`托管成员数量: ${accountBookWithFamily.family.members.length}`);
      
      // 这里可以调用自动创建预算的逻辑进行测试
      // 但为了安全起见，我们只是检查而不实际创建
    }
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustodialMembers();
