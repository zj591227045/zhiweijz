import { PrismaClient, BudgetPeriod } from '@prisma/client';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // 查找用户
    const email = 'zhangjie@jacksonz.cn';
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.error(`用户 ${email} 不存在`);
      return;
    }

    console.log(`找到用户: ${user.name} (${user.email})`);

    // 查找用户的默认账本
    const defaultAccountBook = await prisma.accountBook.findFirst({
      where: {
        userId: user.id,
        isDefault: true
      }
    });

    if (!defaultAccountBook) {
      console.log(`用户没有默认账本，创建一个...`);
      
      // 创建默认账本
      const newAccountBook = await prisma.accountBook.create({
        data: {
          name: '默认账本',
          description: '系统自动创建的默认账本',
          isDefault: true,
          userId: user.id
        }
      });
      
      console.log(`创建了默认账本: ${newAccountBook.name} (${newAccountBook.id})`);
      
      // 使用新创建的账本
      const accountBookId = newAccountBook.id;
      
      // 创建默认预算
      await createDefaultBudget(user.id, accountBookId);
    } else {
      console.log(`找到默认账本: ${defaultAccountBook.name} (${defaultAccountBook.id})`);
      
      // 检查是否已有预算
      const existingBudget = await prisma.budget.findFirst({
        where: {
          userId: user.id,
          accountBookId: defaultAccountBook.id
        }
      });
      
      if (existingBudget) {
        console.log(`用户已有预算: ${existingBudget.name} (${existingBudget.id})`);
      } else {
        // 创建默认预算
        await createDefaultBudget(user.id, defaultAccountBook.id);
      }
    }
    
    console.log('操作完成');
  } catch (error) {
    console.error('发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createDefaultBudget(userId: string, accountBookId: string) {
  // 获取当前月份的开始和结束日期
  const startDate = dayjs().startOf('month').toDate();
  const endDate = dayjs().endOf('month').toDate();
  
  // 创建默认月度预算
  const budget = await prisma.budget.create({
    data: {
      name: '月度总预算',
      amount: 5000, // 默认5000元
      period: BudgetPeriod.MONTHLY,
      startDate,
      endDate,
      userId,
      accountBookId,
      rollover: true,
      enableCategoryBudget: false
    }
  });
  
  console.log(`创建了默认预算: ${budget.name} (${budget.id}), 金额: ${budget.amount}元`);
  
  // 创建几个分类预算
  const categories = [
    { name: '餐饮', amount: 1500, icon: 'utensils' },
    { name: '购物', amount: 1000, icon: 'shopping-bag' },
    { name: '交通', amount: 500, icon: 'car' },
    { name: '娱乐', amount: 800, icon: 'film' }
  ];
  
  for (const cat of categories) {
    // 先创建分类
    const category = await prisma.category.create({
      data: {
        name: cat.name,
        icon: cat.icon,
        type: 'EXPENSE',
        userId,
        accountBookId
      }
    });
    
    // 创建分类预算
    const categoryBudget = await prisma.budget.create({
      data: {
        name: `${cat.name}预算`,
        amount: cat.amount,
        period: BudgetPeriod.MONTHLY,
        startDate,
        endDate,
        categoryId: category.id,
        userId,
        accountBookId,
        rollover: true,
        enableCategoryBudget: true
      }
    });
    
    console.log(`创建了分类预算: ${categoryBudget.name} (${categoryBudget.id}), 金额: ${categoryBudget.amount}元`);
  }
}

main()
  .then(() => console.log('脚本执行成功'))
  .catch(e => console.error('脚本执行失败:', e));
