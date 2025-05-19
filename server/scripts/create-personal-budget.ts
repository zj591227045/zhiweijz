import { PrismaClient, BudgetPeriod, BudgetType } from '@prisma/client';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // 获取命令行参数
    const accountBookId = process.argv[2];
    const userEmail = process.argv[3];

    if (!accountBookId) {
      console.error('请提供账本ID作为第一个参数');
      process.exit(1);
    }

    if (!userEmail) {
      console.error('请提供用户邮箱作为第二个参数');
      process.exit(1);
    }

    console.log(`为账本 ${accountBookId} 创建个人预算...`);

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.error(`用户 ${userEmail} 不存在`);
      process.exit(1);
    }

    console.log(`找到用户: ${user.name} (${user.id})`);

    // 查找账本
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId }
    });

    if (!accountBook) {
      console.error(`账本 ${accountBookId} 不存在`);
      process.exit(1);
    }

    console.log(`找到账本: ${accountBook.name} (${accountBook.id})`);

    // 检查账本是否属于该用户
    if (accountBook.userId !== user.id) {
      console.error(`账本 ${accountBookId} 不属于用户 ${userEmail}`);
      process.exit(1);
    }

    // 检查是否已有预算
    const existingBudget = await prisma.budget.findFirst({
      where: {
        userId: user.id,
        accountBookId: accountBook.id,
        budgetType: BudgetType.PERSONAL
      }
    });

    if (existingBudget) {
      console.log(`账本已有个人预算: ${existingBudget.name} (${existingBudget.id})`);
      process.exit(0);
    }

    // 获取当前月份的开始和结束日期
    const startDate = dayjs().startOf('month').toDate();
    const endDate = dayjs().endOf('month').toDate();

    // 创建个人预算
    const budget = await prisma.budget.create({
      data: {
        name: '个人预算',
        amount: 0, // 默认为0，表示不限制
        period: BudgetPeriod.MONTHLY,
        startDate,
        endDate,
        userId: user.id,
        accountBookId: accountBook.id,
        rollover: false,
        enableCategoryBudget: false,
        isAutoCalculated: false,
        budgetType: BudgetType.PERSONAL
      }
    });

    console.log(`成功创建个人预算: ${budget.name} (${budget.id})`);
    console.log('操作完成');
  } catch (error) {
    console.error('发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => console.log('脚本执行成功'))
  .catch(e => console.error('脚本执行失败:', e));
