const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeBudgetDetails() {
  try {
    console.log('=== 详细分析预算记录 ===');
    
    // 查找张杰的所有预算，包含更多详细信息
    const allBudgets = await prisma.budget.findMany({
      where: {
        userId: 'bc5b8f6e-332f-4bca-8044-59fc475d3096'
      },
      include: {
        user: {
          select: { id: true, name: true }
        },
        familyMember: {
          select: { id: true, name: true, isCustodial: true }
        },
        accountBook: {
          select: { id: true, name: true, familyId: true }
        },
        category: {
          select: { id: true, name: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });
    
    console.log(`找到 ${allBudgets.length} 个预算记录`);
    
    for (const budget of allBudgets) {
      const startDate = new Date(budget.startDate);
      const endDate = new Date(budget.endDate);
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1;
      
      console.log(`\n=== 预算详细信息 ===`);
      console.log(`预算ID: ${budget.id}`);
      console.log(`名称: ${budget.name}`);
      console.log(`时间: ${year}年${month}月 (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`);
      console.log(`金额: ${budget.amount}`);
      console.log(`结转: ${budget.rollover ? '是' : '否'}`);
      console.log(`结转金额: ${budget.rolloverAmount || 0}`);
      console.log(`预算类型: ${budget.budgetType || '未知'}`);
      console.log(`预算周期: ${budget.period || '未知'}`);
      
      // 用户信息
      console.log(`用户: ${budget.user?.name || '未知'} (${budget.userId})`);
      
      // 托管成员信息
      if (budget.familyMemberId) {
        console.log(`托管成员: ${budget.familyMember?.name || '未知'} (${budget.familyMemberId})`);
        console.log(`是否托管: ${budget.familyMember?.isCustodial ? '是' : '否'}`);
      } else {
        console.log(`托管成员: 无`);
      }
      
      // 账本信息
      console.log(`账本: ${budget.accountBook?.name || '未知'} (${budget.accountBookId})`);
      console.log(`家庭ID: ${budget.accountBook?.familyId || '无'}`);
      
      // 分类信息
      if (budget.categoryId) {
        console.log(`分类: ${budget.category?.name || '未知'} (${budget.categoryId})`);
      } else {
        console.log(`分类: 无`);
      }
      
      // 计算该预算的实际使用情况
      const whereCondition = {
        type: 'EXPENSE',
        date: {
          gte: startDate,
          lte: endDate
        },
        accountBookId: budget.accountBookId
      };
      
      // 根据预算类型添加过滤条件
      if (budget.familyMemberId) {
        whereCondition.familyMemberId = budget.familyMemberId;
        console.log(`交易过滤: 托管成员 ${budget.familyMemberId}`);
      } else {
        whereCondition.userId = budget.userId;
        console.log(`交易过滤: 用户 ${budget.userId}`);
      }
      
      // 如果有分类限制
      if (budget.categoryId) {
        whereCondition.categoryId = budget.categoryId;
        console.log(`交易过滤: 分类 ${budget.categoryId}`);
      }
      
      const spentResult = await prisma.transaction.aggregate({
        where: whereCondition,
        _sum: { amount: true }
      });
      
      const spent = spentResult._sum.amount ? Number(spentResult._sum.amount) : 0;
      const totalAvailable = Number(budget.amount) + Number(budget.rolloverAmount || 0);
      const remaining = totalAvailable - spent;
      
      console.log(`实际使用情况:`);
      console.log(`  总可用: ${totalAvailable}`);
      console.log(`  已支出: ${spent}`);
      console.log(`  剩余: ${remaining}`);
      
      // 查询该预算相关的交易数量
      const transactionCount = await prisma.transaction.count({
        where: whereCondition
      });
      
      console.log(`  相关交易数量: ${transactionCount}`);
    }
    
    // 特别分析可疑的预算
    console.log('\n=== 特别分析可疑预算 ===');
    
    const suspiciousBudgets = [
      '34e54c61-527d-42dd-8a36-20057f7d090b',
      '76307d31-368f-4c1f-890b-6023782d9aa2'
    ];
    
    for (const budgetId of suspiciousBudgets) {
      console.log(`\n分析预算 ${budgetId}:`);
      
      const budget = allBudgets.find(b => b.id === budgetId);
      if (budget) {
        console.log(`  创建时间: ${budget.createdAt}`);
        console.log(`  更新时间: ${budget.updatedAt}`);
        console.log(`  账本名称: ${budget.accountBook?.name}`);
        console.log(`  账本家庭ID: ${budget.accountBook?.familyId}`);
        
        // 检查这个账本的其他信息
        const accountBookInfo = await prisma.accountBook.findUnique({
          where: { id: budget.accountBookId },
          include: {
            family: {
              include: {
                members: {
                  select: { id: true, name: true, isCustodial: true }
                }
              }
            },
            users: {
              select: { id: true, name: true }
            }
          }
        });
        
        if (accountBookInfo) {
          console.log(`  账本详情:`);
          console.log(`    名称: ${accountBookInfo.name}`);
          console.log(`    类型: ${accountBookInfo.type}`);
          console.log(`    用户数量: ${accountBookInfo.users?.length || 0}`);
          
          if (accountBookInfo.family) {
            console.log(`    家庭成员数量: ${accountBookInfo.family.members?.length || 0}`);
            accountBookInfo.family.members?.forEach(member => {
              console.log(`      - ${member.name} (托管: ${member.isCustodial ? '是' : '否'})`);
            });
          }
        }
      } else {
        console.log(`  预算不存在或已删除`);
      }
    }
    
    // 分析托管成员预算
    console.log('\n=== 分析托管成员预算 ===');
    
    const custodialBudgetId = '2fc14785-c73e-4b5d-a275-6f2c707d0ddf';
    const custodialBudget = allBudgets.find(b => b.id === custodialBudgetId);
    
    if (custodialBudget) {
      console.log(`托管成员预算详情:`);
      console.log(`  预算ID: ${custodialBudget.id}`);
      console.log(`  金额: ${custodialBudget.amount}`);
      console.log(`  托管成员ID: ${custodialBudget.familyMemberId || '无'}`);
      console.log(`  托管成员名称: ${custodialBudget.familyMember?.name || '无'}`);
      console.log(`  是否真的是托管成员: ${custodialBudget.familyMember?.isCustodial ? '是' : '否'}`);
      
      // 检查这个预算的交易
      const custodialTransactions = await prisma.transaction.findMany({
        where: {
          accountBookId: custodialBudget.accountBookId,
          familyMemberId: custodialBudget.familyMemberId,
          type: 'EXPENSE',
          date: {
            gte: custodialBudget.startDate,
            lte: custodialBudget.endDate
          }
        },
        take: 5
      });
      
      console.log(`  相关交易数量: ${custodialTransactions.length}`);
      custodialTransactions.forEach((tx, index) => {
        console.log(`    ${index + 1}. ${tx.date.toLocaleDateString()}: ${tx.description} - ${tx.amount}元`);
      });
    }
    
  } catch (error) {
    console.error('分析失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeBudgetDetails();
