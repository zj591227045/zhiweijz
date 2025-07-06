const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class BudgetRolloverFixImproved {
  constructor() {
    this.currentYear = new Date().getFullYear();
    this.currentMonth = new Date().getMonth() + 1;
    this.lastYear = this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear;
    this.lastMonth = this.currentMonth === 1 ? 12 : this.currentMonth - 1;
  }

  async diagnose() {
    console.log('🔍 诊断模式: 分析预算结转问题');
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

    let problemCount = 0;

    for (const budget of rolloverBudgets) {
      console.log(`📊 分析预算: ${budget.name} (${budget.id})`);
      console.log(`  账本: ${budget.accountBook?.name || '未知'}`);
      console.log(`  用户: ${budget.familyMember?.name || budget.user?.name || '未知'}`);
      console.log(`  上月金额: ${budget.amount}`);
      console.log(`  上月结转金额: ${budget.rolloverAmount || 0}`);

      // 使用两种方法计算支出
      const spentByBudgetId = await this.calculateSpentByBudgetId(budget.id);
      const spentByConditions = await this.calculateSpentByConditions(budget);

      const totalAvailable = Number(budget.amount) + Number(budget.rolloverAmount || 0);
      const shouldRolloverByBudgetId = totalAvailable - spentByBudgetId;
      const shouldRolloverByConditions = totalAvailable - spentByConditions;

      console.log(`  支出(按budgetId): ${spentByBudgetId}`);
      console.log(`  支出(按条件): ${spentByConditions}`);
      console.log(`  应结转金额(按budgetId): ${shouldRolloverByBudgetId}`);
      console.log(`  应结转金额(按条件): ${shouldRolloverByConditions}`);

      // 检查当月预算
      const currentBudget = await this.findCurrentMonthBudget(budget);
      if (currentBudget) {
        console.log(`  ✅ 找到当月预算: ${currentBudget.id}`);
        console.log(`  当月基础金额: ${currentBudget.amount}`);
        console.log(`  当月结转金额: ${currentBudget.rolloverAmount || 0}`);

        const expectedRollover = shouldRolloverByBudgetId; // 使用budgetId方法的结果
        const actualRollover = Number(currentBudget.rolloverAmount || 0);

        if (Math.abs(expectedRollover - actualRollover) > 0.01) {
          console.log(`  ❌ 结转金额不匹配! 期望: ${expectedRollover}, 实际: ${actualRollover}, 差异: ${expectedRollover - actualRollover}`);
          problemCount++;
        } else {
          console.log(`  ✅ 结转金额正确`);
        }
      } else {
        console.log(`  ❌ 未找到对应的当月预算`);
        problemCount++;
      }

      // 如果两种计算方法结果不同，提示可能的问题
      if (Math.abs(spentByBudgetId - spentByConditions) > 0.01) {
        console.log(`  ⚠️  两种计算方法结果不同，可能存在budgetId设置问题`);
        console.log(`     差异: ${spentByConditions - spentByBudgetId}`);
        
        // 查找没有budgetId的交易
        const transactionsWithoutBudgetId = await this.findTransactionsWithoutBudgetId(budget);
        if (transactionsWithoutBudgetId.length > 0) {
          console.log(`     发现 ${transactionsWithoutBudgetId.length} 条交易记录没有设置budgetId`);
          const totalWithoutBudgetId = transactionsWithoutBudgetId.reduce((sum, t) => sum + Number(t.amount), 0);
          console.log(`     这些交易的总金额: ${totalWithoutBudgetId}`);
        }
      }

      console.log('');
    }

    if (problemCount > 0) {
      console.log(`\n❌ 发现 ${problemCount} 个预算结转问题`);
    } else {
      console.log(`\n🎉 所有预算结转都正确!`);
    }
  }

  // 使用budgetId计算支出（与后端服务一致）
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

  // 使用条件计算支出（修复工具原逻辑）
  async calculateSpentByConditions(budget) {
    const transactions = await prisma.transaction.findMany({
      where: {
        accountBookId: budget.accountBookId,
        type: 'EXPENSE',
        date: {
          gte: budget.startDate,
          lte: budget.endDate
        },
        ...(budget.categoryId && { categoryId: budget.categoryId }),
        ...(budget.familyMemberId ? 
          { familyMemberId: budget.familyMemberId } : 
          { userId: budget.userId }
        )
      }
    });

    return transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  }

  // 查找没有budgetId的交易
  async findTransactionsWithoutBudgetId(budget) {
    return await prisma.transaction.findMany({
      where: {
        accountBookId: budget.accountBookId,
        type: 'EXPENSE',
        date: {
          gte: budget.startDate,
          lte: budget.endDate
        },
        ...(budget.categoryId && { categoryId: budget.categoryId }),
        ...(budget.familyMemberId ? 
          { familyMemberId: budget.familyMemberId } : 
          { userId: budget.userId }
        ),
        budgetId: null
      },
      select: {
        id: true,
        amount: true,
        description: true,
        date: true
      }
    });
  }

  async findCurrentMonthBudget(lastBudget) {
    const currentMonthStart = new Date(this.currentYear, this.currentMonth - 1, 1);
    const currentMonthEnd = new Date(this.currentYear, this.currentMonth, 0);

    const query = {
      startDate: { gte: currentMonthStart },
      endDate: { lte: currentMonthEnd },
      budgetType: 'PERSONAL',
      accountBookId: lastBudget.accountBookId
    };

    if (lastBudget.familyMemberId) {
      query.familyMemberId = lastBudget.familyMemberId;
    } else {
      query.userId = lastBudget.userId;
      query.familyMemberId = null;
    }

    if (lastBudget.categoryId) {
      query.categoryId = lastBudget.categoryId;
    }

    return await prisma.budget.findFirst({ where: query });
  }

  async fixBudgetIds() {
    console.log('🔧 修复模式: 修复交易记录的budgetId');
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
      }
    });

    let fixedCount = 0;

    for (const budget of rolloverBudgets) {
      console.log(`🔧 处理预算: ${budget.name} (${budget.id})`);

      // 查找没有budgetId的相关交易
      const transactionsToFix = await this.findTransactionsWithoutBudgetId(budget);
      
      if (transactionsToFix.length > 0) {
        console.log(`  发现 ${transactionsToFix.length} 条需要修复的交易`);
        
        // 批量更新budgetId
        const result = await prisma.transaction.updateMany({
          where: {
            id: { in: transactionsToFix.map(t => t.id) }
          },
          data: {
            budgetId: budget.id
          }
        });

        console.log(`  ✅ 已修复 ${result.count} 条交易记录的budgetId`);
        fixedCount += result.count;
      } else {
        console.log(`  ✅ 所有交易记录的budgetId都已正确设置`);
      }
    }

    console.log(`\n🎉 总共修复了 ${fixedCount} 条交易记录的budgetId`);
  }

  async fixRolloverAmounts() {
    console.log('🔧 修复模式: 修复结转金额');
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
      }
    });

    let fixedCount = 0;

    for (const budget of rolloverBudgets) {
      console.log(`🔧 处理预算: ${budget.name} (${budget.id})`);

      const spent = await this.calculateSpentByBudgetId(budget.id);
      const totalAvailable = Number(budget.amount) + Number(budget.rolloverAmount || 0);
      const shouldRollover = totalAvailable - spent;

      const currentBudget = await this.findCurrentMonthBudget(budget);

      if (currentBudget) {
        const currentRollover = Number(currentBudget.rolloverAmount || 0);

        if (Math.abs(currentRollover - shouldRollover) > 0.01) {
          await prisma.budget.update({
            where: { id: currentBudget.id },
            data: { rolloverAmount: shouldRollover }
          });

          console.log(`  ✅ 修复结转金额: ${currentRollover} → ${shouldRollover}`);
          fixedCount++;
        } else {
          console.log(`  ✅ 结转金额已正确`);
        }
      } else {
        console.log(`  ❌ 未找到对应的当月预算`);
      }
    }

    console.log(`\n🎉 总共修复了 ${fixedCount} 个预算的结转金额`);
  }
}

async function main() {
  const mode = process.argv[2] || 'diagnose';
  
  console.log('================================================================================');
  console.log('预算结转专用修复工具 (改进版)');
  console.log(`执行时间: ${new Date().toLocaleString()}`);
  console.log(`执行模式: ${mode}`);
  console.log('================================================================================');
  console.log('');

  const fixer = new BudgetRolloverFixImproved();

  try {
    switch (mode) {
      case 'diagnose':
        await fixer.diagnose();
        break;
      case 'fix-budget-ids':
        await fixer.fixBudgetIds();
        break;
      case 'fix-rollover':
        await fixer.fixRolloverAmounts();
        break;
      case 'fix-all':
        await fixer.fixBudgetIds();
        console.log('\n' + '='.repeat(50) + '\n');
        await fixer.fixRolloverAmounts();
        break;
      default:
        console.log('未知模式，支持的模式: diagnose, fix-budget-ids, fix-rollover, fix-all');
    }
  } catch (error) {
    console.error('执行失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
