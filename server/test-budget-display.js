const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * 测试预算显示名称生成逻辑
 */
async function testBudgetDisplayNames() {
  try {
    const accountId = '90fd9e64-252b-498f-9b62-02d0f3d14787';
    
    console.log('=== 测试预算显示名称生成逻辑 ===\n');

    // 获取账本信息
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountId }
    });

    if (!accountBook) {
      console.error('账本不存在');
      return;
    }

    const currentDate = new Date();

    // 获取当前活跃的预算
    const activeBudgets = await prisma.budget.findMany({
      where: {
        OR: [
          {
            accountBookId: accountId,
            startDate: { lte: currentDate },
            endDate: { gte: currentDate }
          },
          ...(accountBook.familyId ? [{
            familyId: accountBook.familyId,
            startDate: { lte: currentDate },
            endDate: { gte: currentDate }
          }] : [])
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        familyMember: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    console.log(`找到 ${activeBudgets.length} 个活跃预算:\n`);

    // 生成LLM提示词预算列表
    const budgetList = [];
    
    for (let i = 0; i < activeBudgets.length; i++) {
      const budget = activeBudgets[i];
      let budgetDisplayName = budget.name;

      console.log(`预算 ${i + 1}:`);
      console.log(`- ID: ${budget.id}`);
      console.log(`- 原始名称: ${budget.name}`);
      console.log(`- 预算类型: ${budget.budgetType}`);
      console.log(`- 用户ID: ${budget.userId || '无'}`);
      console.log(`- 家庭成员ID: ${budget.familyMemberId || '无'}`);

      // 根据预算类型生成正确的显示名称
      if (budget.budgetType === 'GENERAL') {
        // 通用预算：直接使用预算名称
        budgetDisplayName = budget.name;
        console.log(`- 处理逻辑: 通用预算，使用原始名称`);
      } else if (budget.budgetType === 'PERSONAL') {
        // 个人预算：只显示人员名称
        if (budget.familyMemberId && budget.familyMember) {
          // 托管成员预算
          budgetDisplayName = budget.familyMember.user?.name || budget.familyMember.name;
          console.log(`- 处理逻辑: 托管成员预算，使用成员名称`);
          console.log(`- 成员名称: ${budget.familyMember.name}`);
        } else if (budget.userId && budget.user) {
          // 家庭成员预算或个人预算
          budgetDisplayName = budget.user.name;
          console.log(`- 处理逻辑: 个人预算，使用用户名称`);
          console.log(`- 用户名称: ${budget.user.name}`);
        }
      }

      console.log(`- 最终显示名称: ${budgetDisplayName}`);
      budgetList.push(`- 预算名称: ${budgetDisplayName}, ID: ${budget.id}`);
      console.log('');
    }

    console.log('=== 最终的LLM提示词预算列表 ===\n');
    console.log('系统中的可用预算有：');
    console.log(budgetList.join('\n'));

  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行测试
testBudgetDisplayNames();
