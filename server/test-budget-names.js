const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * 测试指定账本的所有预算名称生成逻辑
 * @param {string} accountId 账本ID
 */
async function testBudgetNames(accountId) {
  try {
    console.log(`\n=== 测试账本 ${accountId} 的预算名称 ===\n`);

    // 获取账本信息
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountId },
      include: {
        family: {
          include: {
            members: {
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
        }
      }
    });

    if (!accountBook) {
      console.error('账本不存在');
      return;
    }

    console.log(`账本信息:`);
    console.log(`- ID: ${accountBook.id}`);
    console.log(`- 名称: ${accountBook.name}`);
    console.log(`- 类型: ${accountBook.type}`);
    console.log(`- 家庭ID: ${accountBook.familyId || '无'}`);

    if (accountBook.family && accountBook.family.members) {
      console.log(`\n家庭成员:`);
      accountBook.family.members.forEach(member => {
        console.log(`- ${member.name} (用户ID: ${member.userId || '托管成员'})`);
      });
    }

    const currentDate = new Date();

    // 获取当前活跃的预算
    const activeBudgets = await prisma.budget.findMany({
      where: {
        OR: [
          // 账本预算
          {
            accountBookId: accountId,
            startDate: { lte: currentDate },
            endDate: { gte: currentDate }
          },
          // 家庭预算（如果是家庭账本）
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
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    console.log(`\n=== 活跃预算列表 (共${activeBudgets.length}个) ===\n`);

    if (activeBudgets.length === 0) {
      console.log('没有找到活跃的预算');
      return;
    }

    // 处理每个预算
    for (let i = 0; i < activeBudgets.length; i++) {
      const budget = activeBudgets[i];
      console.log(`预算 ${i + 1}:`);
      console.log(`- 预算ID: ${budget.id}`);
      console.log(`- 原始名称: ${budget.name}`);
      console.log(`- 金额: ${budget.amount}`);
      console.log(`- 周期: ${budget.period}`);
      console.log(`- 用户ID: ${budget.userId || '无'}`);
      console.log(`- 家庭成员ID: ${budget.familyMemberId || '无'}`);
      console.log(`- 账本ID: ${budget.accountBookId || '无'}`);
      console.log(`- 家庭ID: ${budget.familyId || '无'}`);

      if (budget.category) {
        console.log(`- 分类: ${budget.category.name} (${budget.category.type})`);
      }

      // 生成显示名称（按照修复后的逻辑）
      let budgetDisplayName = budget.name;

      // 根据预算类型生成正确的显示名称
      if (budget.budgetType === 'GENERAL') {
        // 通用预算：直接使用预算名称
        budgetDisplayName = budget.name;
        console.log(`- 预算类型: 通用预算`);
      } else if (budget.budgetType === 'PERSONAL') {
        // 个人预算：只显示人员名称
        if (budget.familyMemberId && budget.familyMember) {
          // 托管成员预算
          budgetDisplayName = budget.familyMember.user?.name || budget.familyMember.name;
          console.log(`- 成员信息: ${budget.familyMember.name} (用户: ${budget.familyMember.user?.name || '托管成员'})`);
          console.log(`- 预算类型: 托管成员预算`);
        } else if (budget.userId) {
          // 家庭成员预算或个人预算
          if (budget.user) {
            budgetDisplayName = budget.user.name;
            console.log(`- 用户信息: ${budget.user.name}`);
            console.log(`- 预算类型: ${accountBook.type === 'FAMILY' ? '家庭成员预算' : '个人预算'}`);
          }
        }
      }

      console.log(`- 显示名称: ${budgetDisplayName}`);
      console.log(`- LLM提示词格式: - 预算名称: ${budgetDisplayName}, ID: ${budget.id}`);
      console.log('');
    }

    // 生成完整的LLM提示词预算列表
    console.log(`=== 完整的LLM提示词预算列表 ===\n`);

    const budgetList = [];
    for (const budget of activeBudgets) {
      let budgetDisplayName = budget.name;

      // 根据预算类型生成正确的显示名称
      if (budget.budgetType === 'GENERAL') {
        // 通用预算：直接使用预算名称
        budgetDisplayName = budget.name;
      } else if (budget.budgetType === 'PERSONAL') {
        // 个人预算：只显示人员名称
        if (budget.familyMemberId && budget.familyMember) {
          // 托管成员预算
          budgetDisplayName = budget.familyMember.user?.name || budget.familyMember.name;
        } else if (budget.userId && budget.user) {
          // 家庭成员预算或个人预算
          budgetDisplayName = budget.user.name;
        }
      }

      budgetList.push(`- 预算名称: ${budgetDisplayName}, ID: ${budget.id}`);
    }

    console.log('系统中的可用预算有：');
    console.log(budgetList.join('\n'));

  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行测试
const accountId = '90fd9e64-252b-498f-9b62-02d0f3d14787';
testBudgetNames(accountId);
