const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class RolloverHistoryCreator {
  constructor() {
    this.currentYear = new Date().getFullYear();
    this.currentMonth = new Date().getMonth() + 1;
    this.lastYear = this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear;
    this.lastMonth = this.currentMonth === 1 ? 12 : this.currentMonth - 1;
  }

  async createMissingRolloverHistory() {
    console.log('🔧 创建缺失的结转历史记录');
    console.log('');

    // 查找上个月启用结转的预算
    const lastMonthStart = new Date(this.lastYear, this.lastMonth - 1, 1);
    const lastMonthEnd = new Date(this.lastYear, this.lastMonth, 0);

    const rolloverBudgets = await prisma.budget.findMany({
      where: {
        rollover: true,
        startDate: { gte: lastMonthStart },
        endDate: { lte: lastMonthEnd },
        budgetType: 'PERSONAL'
      },
      include: {
        user: { select: { name: true } },
        familyMember: { select: { name: true } },
        accountBook: { select: { name: true } }
      }
    });

    console.log(`找到 ${rolloverBudgets.length} 个启用结转的上月预算`);
    console.log('');

    let createdCount = 0;

    for (const budget of rolloverBudgets) {
      console.log(`📊 处理预算: ${budget.name} (${budget.id})`);
      console.log(`  账本: ${budget.accountBook?.name || '未知'}`);
      console.log(`  用户: ${budget.familyMember?.name || budget.user?.name || '未知'}`);

      // 检查是否已经有历史记录
      const period = `${budget.endDate.getFullYear()}-${budget.endDate.getMonth() + 1}`;
      const existingHistory = await prisma.budgetHistory.findFirst({
        where: {
          budgetId: budget.id,
          period: period
        }
      });

      if (existingHistory) {
        console.log(`  ✅ 历史记录已存在: ${period}`);
        continue;
      }

      // 计算支出金额
      const spent = await this.calculateSpentByBudgetId(budget.id);
      const amount = Number(budget.amount);
      const currentRolloverAmount = Number(budget.rolloverAmount || 0);
      const totalAvailable = amount + currentRolloverAmount;
      const rolloverAmount = totalAvailable - spent;

      console.log(`  基础金额: ${amount}`);
      console.log(`  上期结转: ${currentRolloverAmount}`);
      console.log(`  实际支出: ${spent}`);
      console.log(`  结转金额: ${rolloverAmount}`);

      // 创建历史记录
      try {
        const rolloverType = rolloverAmount >= 0 ? 'SURPLUS' : 'DEFICIT';
        const rolloverDescription = rolloverAmount >= 0 ? '余额结转' : '债务结转';
        const description = `${rolloverDescription}: 基础预算${amount}, 上期结转${currentRolloverAmount}, 实际支出${spent}, 结转金额${rolloverAmount}`;

        const historyRecord = await prisma.budgetHistory.create({
          data: {
            budgetId: budget.id,
            period: period,
            amount: Math.abs(rolloverAmount), // 存储绝对值
            type: rolloverType,
            description: description,
            budgetAmount: amount,
            spentAmount: spent,
            previousRollover: currentRolloverAmount,
            userId: budget.userId,
            accountBookId: budget.accountBookId,
            budgetType: budget.budgetType || 'PERSONAL',
          }
        });

        console.log(`  ✅ 创建历史记录成功: ${historyRecord.id}`);
        createdCount++;
      } catch (error) {
        console.log(`  ❌ 创建历史记录失败: ${error.message}`);
      }

      console.log('');
    }

    console.log(`🎉 总共创建了 ${createdCount} 条结转历史记录`);
  }

  async createCurrentMonthHistory() {
    console.log('🔧 为当月预算创建结转历史记录');
    console.log('');

    // 查找当月有结转金额的预算
    const currentMonthStart = new Date(this.currentYear, this.currentMonth - 1, 1);
    const currentMonthEnd = new Date(this.currentYear, this.currentMonth, 0);

    const currentBudgets = await prisma.budget.findMany({
      where: {
        rollover: true,
        startDate: { gte: currentMonthStart },
        endDate: { lte: currentMonthEnd },
        budgetType: 'PERSONAL',
        rolloverAmount: { not: 0 } // 只处理有结转金额的预算
      },
      include: {
        user: { select: { name: true } },
        familyMember: { select: { name: true } },
        accountBook: { select: { name: true } }
      }
    });

    console.log(`找到 ${currentBudgets.length} 个当月有结转的预算`);
    console.log('');

    let createdCount = 0;

    for (const budget of currentBudgets) {
      console.log(`📊 处理预算: ${budget.name} (${budget.id})`);
      console.log(`  当月结转金额: ${budget.rolloverAmount}`);

      // 查找对应的上月预算
      const lastMonthBudget = await this.findLastMonthBudget(budget);
      if (!lastMonthBudget) {
        console.log(`  ❌ 未找到对应的上月预算`);
        continue;
      }

      // 检查上月预算是否已经有历史记录
      const lastMonthPeriod = `${lastMonthBudget.endDate.getFullYear()}-${lastMonthBudget.endDate.getMonth() + 1}`;
      const existingHistory = await prisma.budgetHistory.findFirst({
        where: {
          budgetId: lastMonthBudget.id,
          period: lastMonthPeriod
        }
      });

      if (existingHistory) {
        console.log(`  ✅ 上月历史记录已存在: ${lastMonthPeriod}`);
        continue;
      }

      // 计算上月的支出和结转
      const lastMonthSpent = await this.calculateSpentByBudgetId(lastMonthBudget.id);
      const lastMonthAmount = Number(lastMonthBudget.amount);
      const lastMonthPreviousRollover = Number(lastMonthBudget.rolloverAmount || 0);
      const lastMonthTotalAvailable = lastMonthAmount + lastMonthPreviousRollover;
      const rolloverAmount = lastMonthTotalAvailable - lastMonthSpent;

      console.log(`  上月基础金额: ${lastMonthAmount}`);
      console.log(`  上月支出: ${lastMonthSpent}`);
      console.log(`  计算的结转金额: ${rolloverAmount}`);
      console.log(`  当月实际结转: ${budget.rolloverAmount}`);

      // 创建上月的历史记录
      try {
        const rolloverType = rolloverAmount >= 0 ? 'SURPLUS' : 'DEFICIT';
        const rolloverDescription = rolloverAmount >= 0 ? '余额结转' : '债务结转';
        const description = `${rolloverDescription}: 基础预算${lastMonthAmount}, 上期结转${lastMonthPreviousRollover}, 实际支出${lastMonthSpent}, 结转金额${rolloverAmount}`;

        const historyRecord = await prisma.budgetHistory.create({
          data: {
            budgetId: lastMonthBudget.id,
            period: lastMonthPeriod,
            amount: Math.abs(rolloverAmount),
            type: rolloverType,
            description: description,
            budgetAmount: lastMonthAmount,
            spentAmount: lastMonthSpent,
            previousRollover: lastMonthPreviousRollover,
            userId: lastMonthBudget.userId,
            accountBookId: lastMonthBudget.accountBookId,
            budgetType: lastMonthBudget.budgetType || 'PERSONAL',
          }
        });

        console.log(`  ✅ 创建上月历史记录成功: ${historyRecord.id}`);
        createdCount++;
      } catch (error) {
        console.log(`  ❌ 创建历史记录失败: ${error.message}`);
      }

      console.log('');
    }

    console.log(`🎉 总共创建了 ${createdCount} 条结转历史记录`);
  }

  async findLastMonthBudget(currentBudget) {
    const lastMonthStart = new Date(this.lastYear, this.lastMonth - 1, 1);
    const lastMonthEnd = new Date(this.lastYear, this.lastMonth, 0);

    const query = {
      startDate: { gte: lastMonthStart },
      endDate: { lte: lastMonthEnd },
      budgetType: 'PERSONAL',
      accountBookId: currentBudget.accountBookId
    };

    if (currentBudget.familyMemberId) {
      query.familyMemberId = currentBudget.familyMemberId;
    } else {
      query.userId = currentBudget.userId;
      query.familyMemberId = null;
    }

    if (currentBudget.categoryId) {
      query.categoryId = currentBudget.categoryId;
    }

    return await prisma.budget.findFirst({ where: query });
  }

  async calculateSpentByBudgetId(budgetId) {
    const result = await prisma.transaction.aggregate({
      where: {
        budgetId: budgetId,
        type: 'EXPENSE'
      },
      _sum: {
        amount: true
      }
    });

    return result._sum.amount ? Number(result._sum.amount) : 0;
  }

  async listExistingHistory() {
    console.log('📋 查看现有的结转历史记录');
    console.log('');

    const histories = await prisma.budgetHistory.findMany({
      include: {
        budget: {
          select: {
            name: true,
            accountBook: { select: { name: true } }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`找到 ${histories.length} 条历史记录:`);
    console.log('');

    for (const history of histories) {
      console.log(`📊 ${history.period} - ${history.budget?.name || '未知预算'}`);
      console.log(`  账本: ${history.budget?.accountBook?.name || '未知'}`);
      console.log(`  类型: ${history.type}`);
      console.log(`  金额: ${history.amount}`);
      console.log(`  描述: ${history.description || '无'}`);
      console.log(`  创建时间: ${history.createdAt.toLocaleString()}`);
      console.log('');
    }
  }
}

async function main() {
  const mode = process.argv[2] || 'create-missing';
  
  console.log('================================================================================');
  console.log('预算结转历史记录创建工具');
  console.log(`执行时间: ${new Date().toLocaleString()}`);
  console.log(`执行模式: ${mode}`);
  console.log('================================================================================');
  console.log('');

  const creator = new RolloverHistoryCreator();

  try {
    switch (mode) {
      case 'create-missing':
        await creator.createMissingRolloverHistory();
        break;
      case 'create-current':
        await creator.createCurrentMonthHistory();
        break;
      case 'list':
        await creator.listExistingHistory();
        break;
      case 'create-all':
        await creator.createMissingRolloverHistory();
        console.log('\n' + '='.repeat(50) + '\n');
        await creator.createCurrentMonthHistory();
        break;
      default:
        console.log('未知模式，支持的模式: create-missing, create-current, list, create-all');
    }
  } catch (error) {
    console.error('执行失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
