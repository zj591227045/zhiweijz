const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const budgetId = '0b1060ab-4d3a-46fe-8d95-ddd3d7f9deca';

    // 检查预算是否存在
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId }
    });

    if (!budget) {
      console.log(`预算 ${budgetId} 不存在`);
      return;
    }

    console.log(`为预算 ${budgetId} 创建测试结转历史数据`);

    // 创建6个月的结转历史记录
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 删除现有的结转历史记录
    await prisma.budgetHistory.deleteMany({
      where: { budgetId }
    });

    // 创建新的结转历史记录
    for (let i = 1; i <= 6; i++) {
      const month = currentMonth - i;
      const year = month < 0 ? currentYear - 1 : currentYear;
      const adjustedMonth = month < 0 ? month + 12 : month;

      const amount = Math.floor(Math.random() * 400) - 200;
      const type = amount >= 0 ? 'SURPLUS' : 'DEFICIT';

      await prisma.budgetHistory.create({
        data: {
          budgetId,
          period: `${year}年${adjustedMonth + 1}月`,
          amount: Math.abs(amount),
          type,
          description: `${year}年${adjustedMonth + 1}月预算结转`,
          createdAt: new Date(year, adjustedMonth, 15)
        }
      });

      console.log(`创建了 ${year}年${adjustedMonth + 1}月 的结转记录，金额: ${amount}, 类型: ${type}`);
    }

    console.log('测试数据创建完成');
  } catch (error) {
    console.error('创建测试数据时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
