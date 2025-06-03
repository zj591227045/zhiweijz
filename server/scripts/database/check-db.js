const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // 检查用户表
    const userCount = await prisma.user.count();
    console.log(`用户表记录数: ${userCount}`);

    if (userCount > 0) {
      const users = await prisma.user.findMany({ take: 5 });
      console.log('用户示例:', users);
    }

    // 检查账本表
    const accountBookCount = await prisma.accountBook.count();
    console.log(`账本表记录数: ${accountBookCount}`);

    if (accountBookCount > 0) {
      const accountBooks = await prisma.accountBook.findMany({ take: 5 });
      console.log('账本示例:', accountBooks);
    }

    // 检查分类表
    const categoryCount = await prisma.category.count();
    console.log(`分类表记录数: ${categoryCount}`);

    // 检查交易表
    const transactionCount = await prisma.transaction.count();
    console.log(`交易表记录数: ${transactionCount}`);

    // 检查预算表
    const budgetCount = await prisma.budget.count();
    console.log(`预算表记录数: ${budgetCount}`);

    // 检查分类预算表
    try {
      const categoryBudgetCount = await prisma.categoryBudget.count();
      console.log(`分类预算表记录数: ${categoryBudgetCount}`);
    } catch (error) {
      console.log('分类预算表不存在或无法访问');
    }

  } catch (error) {
    console.error('查询数据库时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
