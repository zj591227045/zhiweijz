const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SimpleRolloverHistoryCreator {
  constructor() {
    this.currentYear = new Date().getFullYear();
    this.currentMonth = new Date().getMonth() + 1;
    this.lastYear = this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear;
    this.lastMonth = this.currentMonth === 1 ? 12 : this.currentMonth - 1;
  }

  async createMissingRolloverHistory() {
    console.log('🔧 创建缺失的结转历史记录（简化版）');
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

      // 检查是否已经有历史记录（使用原生查询避免 Prisma 字段问题）
      const period = `${budget.endDate.getFullYear()}-${budget.endDate.getMonth() + 1}`;
      
      try {
        const existingHistory = await prisma.$queryRaw`
          SELECT id FROM budget_histories 
          WHERE budget_id = ${budget.id} AND period = ${period}
          LIMIT 1
        `;

        if (existingHistory.length > 0) {
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

        // 创建历史记录（使用原生查询）
        const rolloverType = rolloverAmount >= 0 ? 'SURPLUS' : 'DEFICIT';
        const rolloverDescription = rolloverAmount >= 0 ? '余额结转' : '债务结转';
        const description = `${rolloverDescription}: 基础预算${amount}, 上期结转${currentRolloverAmount}, 实际支出${spent}, 结转金额${rolloverAmount}`;

        const historyId = `history-${budget.id}-${period}`;
        
        await prisma.$executeRaw`
          INSERT INTO budget_histories (
            id, budget_id, period, amount, type, description, 
            budget_amount, spent_amount, previous_rollover,
            created_at, updated_at
          ) VALUES (
            ${historyId}, ${budget.id}, ${period}, ${Math.abs(rolloverAmount)}, 
            ${rolloverType}::"RolloverType", ${description},
            ${amount}, ${spent}, ${currentRolloverAmount},
            NOW(), NOW()
          )
        `;

        console.log(`  ✅ 创建历史记录成功: ${historyId}`);
        createdCount++;
      } catch (error) {
        console.log(`  ❌ 创建历史记录失败: ${error.message}`);
      }

      console.log('');
    }

    console.log(`🎉 总共创建了 ${createdCount} 条结转历史记录`);
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

    try {
      // 使用原生查询避免 Prisma 字段问题
      const histories = await prisma.$queryRaw`
        SELECT 
          bh.id, bh.budget_id, bh.period, bh.amount, bh.type, 
          bh.description, bh.created_at,
          b.name as budget_name,
          ab.name as account_book_name
        FROM budget_histories bh
        LEFT JOIN budgets b ON bh.budget_id = b.id
        LEFT JOIN account_books ab ON b.account_book_id = ab.id
        ORDER BY bh.created_at DESC
      `;

      console.log(`找到 ${histories.length} 条历史记录:`);
      console.log('');

      for (const history of histories) {
        console.log(`📊 ${history.period} - ${history.budget_name || '未知预算'}`);
        console.log(`  账本: ${history.account_book_name || '未知'}`);
        console.log(`  类型: ${history.type}`);
        console.log(`  金额: ${history.amount}`);
        console.log(`  描述: ${history.description || '无'}`);
        console.log(`  创建时间: ${new Date(history.created_at).toLocaleString()}`);
        console.log('');
      }
    } catch (error) {
      console.log(`❌ 查询失败: ${error.message}`);
    }
  }

  async checkDatabaseStructure() {
    console.log('🔍 检查数据库结构');
    console.log('');

    try {
      // 检查 budget_histories 表结构
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'budget_histories' 
        ORDER BY ordinal_position
      `;

      console.log('budget_histories 表字段:');
      for (const col of columns) {
        console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      }
    } catch (error) {
      console.log(`❌ 检查失败: ${error.message}`);
    }
  }
}

async function main() {
  const mode = process.argv[2] || 'create-missing';
  
  console.log('================================================================================');
  console.log('预算结转历史记录创建工具（简化版）');
  console.log(`执行时间: ${new Date().toLocaleString()}`);
  console.log(`执行模式: ${mode}`);
  console.log('================================================================================');
  console.log('');

  const creator = new SimpleRolloverHistoryCreator();

  try {
    switch (mode) {
      case 'create-missing':
        await creator.createMissingRolloverHistory();
        break;
      case 'list':
        await creator.listExistingHistory();
        break;
      case 'check-db':
        await creator.checkDatabaseStructure();
        break;
      default:
        console.log('未知模式，支持的模式: create-missing, list, check-db');
    }
  } catch (error) {
    console.error('执行失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
