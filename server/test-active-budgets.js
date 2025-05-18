/**
 * 测试活跃预算API
 *
 * 这个脚本直接使用数据库查询来测试修改后的findActiveBudgets方法
 */

// 导入PrismaClient
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testActiveBudgets() {
  try {
    console.log('开始测试...');

    // 查找一个有预算的用户
    console.log('查询有预算的用户...');

    // 先查找有预算的用户
    const budgetWithUser = await prisma.budget.findFirst({
      select: {
        userId: true
      }
    });

    if (!budgetWithUser || !budgetWithUser.userId) {
      console.error('数据库中没有带用户ID的预算');

      // 尝试使用第一个用户
      const user = await prisma.user.findFirst();
      if (!user) {
        console.error('数据库中没有用户');
        return;
      }
      console.log('使用第一个用户');
      var userId = user.id;
    } else {
      console.log('找到有预算的用户');
      var userId = budgetWithUser.userId;
    }
    console.log(`使用用户ID: ${userId}`);

    // 1. 查找用户所属的所有家庭ID
    const familyMembers = await prisma.familyMember.findMany({
      where: { userId },
      select: { familyId: true },
    });

    const familyIds = familyMembers.map(member => member.familyId);
    console.log(`用户所属的家庭IDs: ${familyIds.join(', ') || '无'}`);

    // 2. 获取当前日期
    const date = new Date();

    // 3. 构建查询条件：包括用户个人预算和用户所属家庭的预算
    // 构建查询条件
    const where = {
      OR: []
    };

    // 添加用户个人预算条件
    where.OR.push({
      userId,
      startDate: { lte: date },
      endDate: { gte: date },
    });

    // 只有当用户属于至少一个家庭时，才添加家庭预算条件
    if (familyIds.length > 0) {
      where.OR.push({
        familyId: { in: familyIds },
        startDate: { lte: date },
        endDate: { gte: date },
      });
    }

    console.log('查询条件:', JSON.stringify(where, null, 2));

    const budgets = await prisma.budget.findMany({
      where,
      include: {
        category: true,
        accountBook: {
          select: {
            id: true,
            name: true,
            type: true,
            familyId: true
          }
        }
      },
    });

    console.log(`找到 ${budgets.length} 个活跃预算`);

    // 打印每个预算的详细信息
    budgets.forEach((budget, index) => {
      console.log(`\n预算 ${index + 1}:`);
      console.log(`ID: ${budget.id}`);
      console.log(`名称: ${budget.name}`);
      console.log(`用户ID: ${budget.userId || '无'}`);
      console.log(`家庭ID: ${budget.familyId || '无'}`);
      console.log(`账本ID: ${budget.accountBookId || '无'}`);

      if (budget.accountBook) {
        console.log(`账本名称: ${budget.accountBook.name}`);
        console.log(`账本类型: ${budget.accountBook.type}`);
        console.log(`账本家庭ID: ${budget.accountBook.familyId || '无'}`);
      } else {
        console.log('账本信息: 无');
      }

      console.log(`金额: ${budget.amount}`);
    });

    console.log('\n测试完成!');
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行测试
testActiveBudgets();
