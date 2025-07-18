const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function createTest13BudgetData() {
  try {
    console.log('开始为test13@test.com用户生成预算和记账数据...');

    // 查找test13用户
    const user = await prisma.user.findUnique({
      where: { email: 'test13@test.com' }
    });

    if (!user) {
      throw new Error('test13@test.com 用户不存在');
    }

    const userId = user.id;
    console.log('找到用户ID:', userId);

    // 查找用户的账本
    const accountBook = await prisma.accountBook.findFirst({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    if (!accountBook) {
      throw new Error('test13用户没有账本');
    }

    const accountBookId = accountBook.id;
    console.log('找到账本ID:', accountBookId);

    // 查找分类ID
    const categoriesList = await prisma.category.findMany({
      where: {
        name: { in: ['餐饮', '交通', '娱乐', '购物'] },
        isDefault: true
      }
    });

    const categories = {};
    categoriesList.forEach(cat => {
      categories[cat.name] = cat.id;
    });

    // 如果没有找到默认分类，使用第一个支出分类
    if (Object.keys(categories).length === 0) {
      const fallbackCategory = await prisma.category.findFirst({
        where: { type: 'EXPENSE' }
      });
      if (fallbackCategory) {
        const fallbackId = fallbackCategory.id;
        categories['餐饮'] = fallbackId;
        categories['交通'] = fallbackId;
        categories['娱乐'] = fallbackId;
        categories['购物'] = fallbackId;
      }
    }

    console.log('分类ID:', categories);
    
    // 计算月份范围
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    
    console.log('时间范围:');
    console.log('当前月:', currentMonthStart.toISOString().split('T')[0], '到', currentMonthEnd.toISOString().split('T')[0]);
    console.log('上月:', lastMonthStart.toISOString().split('T')[0], '到', lastMonthEnd.toISOString().split('T')[0]);
    console.log('前月:', twoMonthsAgoStart.toISOString().split('T')[0], '到', twoMonthsAgoEnd.toISOString().split('T')[0]);
    
    // 删除已存在的测试数据
    await prisma.transaction.deleteMany({
      where: {
        userId,
        date: {
          gte: twoMonthsAgoStart,
          lte: currentMonthEnd
        }
      }
    });

    await prisma.budget.deleteMany({
      where: {
        userId,
        startDate: {
          gte: twoMonthsAgoStart
        },
        endDate: {
          lte: currentMonthEnd
        }
      }
    });

    console.log('已清理旧的测试数据');
    
    // 创建3个月的预算
    const budgets = [
      {
        name: 'test13个人预算',
        amount: 3000.00,
        startDate: currentMonthStart,
        endDate: currentMonthEnd,
        period: '当前月'
      },
      {
        name: 'test13个人预算',
        amount: 3000.00,
        startDate: lastMonthStart,
        endDate: lastMonthEnd,
        period: '上月'
      },
      {
        name: 'test13个人预算',
        amount: 3000.00,
        startDate: twoMonthsAgoStart,
        endDate: twoMonthsAgoEnd,
        period: '前月'
      }
    ];
    
    for (const budget of budgets) {
      await prisma.budget.create({
        data: {
          name: budget.name,
          amount: budget.amount,
          period: 'MONTHLY',
          startDate: budget.startDate,
          endDate: budget.endDate,
          userId,
          accountBookId,
          budgetType: 'PERSONAL'
        }
      });

      console.log(`已创建${budget.period}预算: ¥${budget.amount}`);
    }
    
    // 生成记账数据
    const transactions = [
      // 当前月记账 (总计 ¥176.00)
      { amount: 45.50, category: '餐饮', description: '午餐', date: new Date(currentMonthStart.getTime() + 2 * 24 * 60 * 60 * 1000) },
      { amount: 12.00, category: '交通', description: '地铁', date: new Date(currentMonthStart.getTime() + 3 * 24 * 60 * 60 * 1000) },
      { amount: 68.80, category: '餐饮', description: '晚餐', date: new Date(currentMonthStart.getTime() + 5 * 24 * 60 * 60 * 1000) },
      { amount: 25.00, category: '娱乐', description: '电影票', date: new Date(currentMonthStart.getTime() + 7 * 24 * 60 * 60 * 1000) },
      { amount: 24.70, category: '交通', description: '打车', date: new Date(currentMonthStart.getTime() + 8 * 24 * 60 * 60 * 1000) },
      
      // 上月记账 (总计 ¥2,450.00)
      { amount: 580.00, category: '购物', description: '购买衣服', date: new Date(lastMonthStart.getTime() + 3 * 24 * 60 * 60 * 1000) },
      { amount: 320.50, category: '餐饮', description: '聚餐', date: new Date(lastMonthStart.getTime() + 5 * 24 * 60 * 60 * 1000) },
      { amount: 150.00, category: '娱乐', description: '健身房', date: new Date(lastMonthStart.getTime() + 8 * 24 * 60 * 60 * 1000) },
      { amount: 89.90, category: '交通', description: '加油', date: new Date(lastMonthStart.getTime() + 10 * 24 * 60 * 60 * 1000) },
      { amount: 245.60, category: '餐饮', description: '超市购物', date: new Date(lastMonthStart.getTime() + 12 * 24 * 60 * 60 * 1000) },
      { amount: 180.00, category: '娱乐', description: 'KTV', date: new Date(lastMonthStart.getTime() + 15 * 24 * 60 * 60 * 1000) },
      { amount: 420.00, category: '购物', description: '电子产品', date: new Date(lastMonthStart.getTime() + 18 * 24 * 60 * 60 * 1000) },
      { amount: 95.50, category: '餐饮', description: '外卖', date: new Date(lastMonthStart.getTime() + 20 * 24 * 60 * 60 * 1000) },
      { amount: 68.50, category: '交通', description: '公交月票', date: new Date(lastMonthStart.getTime() + 22 * 24 * 60 * 60 * 1000) },
      { amount: 300.00, category: '娱乐', description: '旅游', date: new Date(lastMonthStart.getTime() + 25 * 24 * 60 * 60 * 1000) },
      
      // 前月记账 (总计 ¥2,780.00)
      { amount: 650.00, category: '购物', description: '家具', date: new Date(twoMonthsAgoStart.getTime() + 2 * 24 * 60 * 60 * 1000) },
      { amount: 280.30, category: '餐饮', description: '生日聚餐', date: new Date(twoMonthsAgoStart.getTime() + 4 * 24 * 60 * 60 * 1000) },
      { amount: 120.00, category: '交通', description: '火车票', date: new Date(twoMonthsAgoStart.getTime() + 6 * 24 * 60 * 60 * 1000) },
      { amount: 380.50, category: '娱乐', description: '演唱会', date: new Date(twoMonthsAgoStart.getTime() + 8 * 24 * 60 * 60 * 1000) },
      { amount: 195.80, category: '餐饮', description: '日常餐饮', date: new Date(twoMonthsAgoStart.getTime() + 10 * 24 * 60 * 60 * 1000) },
      { amount: 450.00, category: '购物', description: '护肤品', date: new Date(twoMonthsAgoStart.getTime() + 12 * 24 * 60 * 60 * 1000) },
      { amount: 85.40, category: '交通', description: '滴滴出行', date: new Date(twoMonthsAgoStart.getTime() + 14 * 24 * 60 * 60 * 1000) },
      { amount: 220.00, category: '娱乐', description: '游戏充值', date: new Date(twoMonthsAgoStart.getTime() + 16 * 24 * 60 * 60 * 1000) },
      { amount: 168.90, category: '餐饮', description: '咖啡店', date: new Date(twoMonthsAgoStart.getTime() + 18 * 24 * 60 * 60 * 1000) },
      { amount: 320.00, category: '购物', description: '书籍', date: new Date(twoMonthsAgoStart.getTime() + 20 * 24 * 60 * 60 * 1000) },
      { amount: 99.10, category: '交通', description: '停车费', date: new Date(twoMonthsAgoStart.getTime() + 22 * 24 * 60 * 60 * 1000) }
    ];
    
    for (const transaction of transactions) {
      const categoryId = categories[transaction.category] || categories['餐饮'];
      await prisma.transaction.create({
        data: {
          amount: transaction.amount,
          type: 'EXPENSE',
          categoryId,
          description: transaction.description,
          date: transaction.date,
          userId,
          accountBookId
        }
      });
    }
    
    console.log('已生成所有记账数据');
    console.log('');
    console.log('=== 数据汇总 ===');
    console.log('当前月支出: ¥176.00 (预算剩余: ¥2,824.00)');
    console.log('上月支出: ¥2,450.00 (预算剩余: ¥550.00)');
    console.log('前月支出: ¥2,780.00 (预算超支: ¥220.00)');
    console.log('3个月总预算: ¥9,000.00');
    console.log('3个月总支出: ¥5,406.00');
    console.log('3个月总剩余: ¥3,594.00');
    console.log('');
    console.log('现在可以测试跨月个人预算聚合功能了！');
    
  } catch (error) {
    console.error('生成测试数据失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行脚本
createTest13BudgetData()
  .then(() => {
    console.log('测试数据生成完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
