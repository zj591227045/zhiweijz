/**
 * 预算管理系统数据修复脚本
 * 用于修复家庭账本成员预算创建失败和预算结转功能失效的问题
 */

const { PrismaClient } = require('@prisma/client');
const dayjs = require('dayjs');

const prisma = new PrismaClient();

class BudgetFixService {
  constructor() {
    this.currentDate = new Date();
    this.currentYear = this.currentDate.getFullYear();
    this.currentMonth = this.currentDate.getMonth() + 1;
    this.lastMonth = this.currentMonth === 1 ? 12 : this.currentMonth - 1;
    this.lastMonthYear = this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear;
    this.dryRun = process.argv.includes('--dry-run');
  }

  /**
   * 主修复函数
   */
  async runFix() {
    console.log('='.repeat(80));
    console.log('预算管理系统数据修复脚本');
    console.log(`执行时间: ${new Date().toLocaleString()}`);
    console.log(`当前月份: ${this.currentYear}-${this.currentMonth}`);
    console.log(`模式: ${this.dryRun ? '预览模式 (不会实际修改数据)' : '执行模式'}`);
    console.log('='.repeat(80));

    try {
      // 1. 修复缺失的家庭成员预算
      await this.fixMissingFamilyMemberBudgets();
      
      // 2. 修复预算结转问题
      await this.fixBudgetRolloverIssues();
      
      // 3. 验证修复结果
      await this.verifyFixResults();
      
      console.log('\n✅ 修复完成!');
      
    } catch (error) {
      console.error('修复过程中发生错误:', error);
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * 修复缺失的家庭成员预算
   */
  async fixMissingFamilyMemberBudgets() {
    console.log('\n🔧 1. 修复缺失的家庭成员预算');
    console.log('-'.repeat(50));

    // 获取当前月份的起止日期
    const currentMonthStart = new Date(this.currentYear, this.currentMonth - 1, 1);
    const currentMonthEnd = new Date(this.currentYear, this.currentMonth, 0);

    // 查询所有家庭账本
    const familyAccountBooks = await prisma.accountBook.findMany({
      where: { type: 'FAMILY' },
      include: {
        family: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true } }
              }
            }
          }
        }
      }
    });

    let totalFixed = 0;

    for (const accountBook of familyAccountBooks) {
      console.log(`\n处理家庭账本: ${accountBook.name} (${accountBook.id})`);
      
      if (!accountBook.family) {
        console.log('  跳过: 无家庭数据');
        continue;
      }

      const allMembers = accountBook.family.members;
      const registeredMembers = allMembers.filter(m => m.userId);
      const custodialMembers = allMembers.filter(m => m.isCustodial);

      console.log(`  注册成员: ${registeredMembers.length}, 托管成员: ${custodialMembers.length}`);

      // 检查并创建注册成员的预算
      for (const member of registeredMembers) {
        const existingBudget = await prisma.budget.findFirst({
          where: {
            userId: member.userId,
            accountBookId: accountBook.id,
            budgetType: 'PERSONAL',
            startDate: { gte: currentMonthStart },
            endDate: { lte: currentMonthEnd },
            familyMemberId: null
          }
        });

        if (!existingBudget) {
          console.log(`  ❌ 缺少预算: ${member.name} (${member.user?.name})`);
          
          if (!this.dryRun) {
            await this.createMemberBudget(member.userId, accountBook, null, member.name);
            totalFixed++;
            console.log(`  ✅ 已创建预算`);
          } else {
            console.log(`  📝 将创建预算 (预览模式)`);
          }
        } else {
          console.log(`  ✅ 预算已存在: ${member.name}`);
        }
      }

      // 检查并创建托管成员的预算
      for (const member of custodialMembers) {
        const existingBudget = await prisma.budget.findFirst({
          where: {
            familyMemberId: member.id,
            accountBookId: accountBook.id,
            budgetType: 'PERSONAL',
            startDate: { gte: currentMonthStart },
            endDate: { lte: currentMonthEnd }
          }
        });

        if (!existingBudget) {
          console.log(`  ❌ 缺少托管预算: ${member.name}`);
          
          if (!this.dryRun) {
            // 托管成员预算需要关联到家庭创建者
            await this.createMemberBudget(accountBook.userId, accountBook, member.id, member.name);
            totalFixed++;
            console.log(`  ✅ 已创建托管预算`);
          } else {
            console.log(`  📝 将创建托管预算 (预览模式)`);
          }
        } else {
          console.log(`  ✅ 托管预算已存在: ${member.name}`);
        }
      }
    }

    console.log(`\n修复统计: ${this.dryRun ? '预计' : '实际'}创建了 ${totalFixed} 个预算`);
  }

  /**
   * 创建成员预算
   */
  async createMemberBudget(userId, accountBook, familyMemberId, memberName) {
    const currentMonthStart = new Date(this.currentYear, this.currentMonth - 1, 1);
    const currentMonthEnd = new Date(this.currentYear, this.currentMonth, 0);

    // 查找该成员的历史预算作为模板
    const templateBudget = await prisma.budget.findFirst({
      where: {
        ...(familyMemberId ? { familyMemberId } : { userId, familyMemberId: null }),
        accountBookId: accountBook.id,
        budgetType: 'PERSONAL'
      },
      orderBy: { endDate: 'desc' }
    });

    const budgetData = {
      name: templateBudget?.name || '个人预算',
      amount: templateBudget?.amount || 0,
      period: 'MONTHLY',
      startDate: currentMonthStart,
      endDate: currentMonthEnd,
      userId: userId,
      familyId: accountBook.familyId,
      accountBookId: accountBook.id,
      rollover: templateBudget?.rollover || false,
      enableCategoryBudget: templateBudget?.enableCategoryBudget || false,
      isAutoCalculated: templateBudget?.isAutoCalculated || false,
      budgetType: 'PERSONAL',
      refreshDay: templateBudget?.refreshDay || 1,
      ...(familyMemberId && { familyMemberId })
    };

    // 如果启用了结转，计算结转金额
    if (templateBudget?.rollover && templateBudget) {
      const rolloverAmount = await this.calculateRolloverAmount(templateBudget.id);
      if (rolloverAmount > 0) {
        budgetData.rolloverAmount = rolloverAmount;
      }
    }

    const newBudget = await prisma.budget.create({
      data: budgetData
    });

    return newBudget;
  }

  /**
   * 计算结转金额
   */
  async calculateRolloverAmount(budgetId) {
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId }
    });

    if (!budget || !budget.rollover) return 0;

    // 计算实际支出
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

    const spent = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalAvailable = Number(budget.amount) + Number(budget.rolloverAmount || 0);
    const remaining = totalAvailable - spent;

    return Math.max(0, remaining); // 只结转正数
  }

  /**
   * 修复预算结转问题
   */
  async fixBudgetRolloverIssues() {
    console.log('\n🔄 2. 修复预算结转问题');
    console.log('-'.repeat(50));

    // 获取上个月和当前月份的起止日期
    const lastMonthStart = new Date(this.lastMonthYear, this.lastMonth - 1, 1);
    const lastMonthEnd = new Date(this.lastMonthYear, this.lastMonth, 0);
    const currentMonthStart = new Date(this.currentYear, this.currentMonth - 1, 1);
    const currentMonthEnd = new Date(this.currentYear, this.currentMonth, 0);

    // 查询上个月启用结转的预算
    const lastMonthRolloverBudgets = await prisma.budget.findMany({
      where: {
        startDate: { gte: lastMonthStart },
        endDate: { lte: lastMonthEnd },
        rollover: true,
        budgetType: 'PERSONAL'
      }
    });

    console.log(`找到 ${lastMonthRolloverBudgets.length} 个启用结转的上月预算`);

    let fixedCount = 0;

    for (const lastBudget of lastMonthRolloverBudgets) {
      // 计算应该结转的金额
      const shouldRollover = await this.calculateRolloverAmount(lastBudget.id);
      
      // 查找对应的当月预算
      const currentBudgetQuery = {
        startDate: { gte: currentMonthStart },
        endDate: { lte: currentMonthEnd },
        budgetType: 'PERSONAL',
        accountBookId: lastBudget.accountBookId
      };

      if (lastBudget.familyMemberId) {
        currentBudgetQuery.familyMemberId = lastBudget.familyMemberId;
      } else {
        currentBudgetQuery.userId = lastBudget.userId;
        currentBudgetQuery.familyMemberId = null;
      }

      const currentBudget = await prisma.budget.findFirst({
        where: currentBudgetQuery
      });

      if (currentBudget) {
        const currentRollover = Number(currentBudget.rolloverAmount || 0);
        
        if (shouldRollover > 0 && currentRollover !== shouldRollover) {
          console.log(`  ❌ 结转金额错误: 预算 ${currentBudget.id}`);
          console.log(`     期望: ${shouldRollover}, 实际: ${currentRollover}`);
          
          if (!this.dryRun) {
            await prisma.budget.update({
              where: { id: currentBudget.id },
              data: { rolloverAmount: shouldRollover }
            });
            fixedCount++;
            console.log(`  ✅ 已修复结转金额`);
          } else {
            console.log(`  📝 将修复结转金额 (预览模式)`);
          }
        } else if (shouldRollover > 0) {
          console.log(`  ✅ 结转金额正确: 预算 ${currentBudget.id}`);
        }
      } else {
        console.log(`  ⚠️  未找到对应的当月预算: ${lastBudget.id}`);
      }
    }

    console.log(`\n结转修复统计: ${this.dryRun ? '预计' : '实际'}修复了 ${fixedCount} 个预算的结转金额`);
  }

  /**
   * 验证修复结果
   */
  async verifyFixResults() {
    console.log('\n✅ 3. 验证修复结果');
    console.log('-'.repeat(50));

    // 重新运行诊断逻辑来验证修复效果
    const currentMonthStart = new Date(this.currentYear, this.currentMonth - 1, 1);
    const currentMonthEnd = new Date(this.currentYear, this.currentMonth, 0);

    const familyAccountBooks = await prisma.accountBook.findMany({
      where: { type: 'FAMILY' },
      include: {
        family: {
          include: {
            members: true
          }
        }
      }
    });

    let totalIssues = 0;

    for (const accountBook of familyAccountBooks) {
      if (!accountBook.family) continue;

      const allMembers = accountBook.family.members;
      const registeredMembers = allMembers.filter(m => m.userId);
      const custodialMembers = allMembers.filter(m => m.isCustodial);
      const expectedBudgets = registeredMembers.length + custodialMembers.length;

      const actualBudgets = await prisma.budget.count({
        where: {
          accountBookId: accountBook.id,
          budgetType: 'PERSONAL',
          startDate: { gte: currentMonthStart },
          endDate: { lte: currentMonthEnd }
        }
      });

      console.log(`${accountBook.name}: 期望 ${expectedBudgets} 个预算, 实际 ${actualBudgets} 个预算`);

      if (actualBudgets < expectedBudgets) {
        totalIssues += (expectedBudgets - actualBudgets);
        console.log(`  ❌ 仍有 ${expectedBudgets - actualBudgets} 个预算缺失`);
      } else {
        console.log(`  ✅ 预算完整`);
      }
    }

    if (totalIssues === 0) {
      console.log('\n🎉 所有问题已修复!');
    } else {
      console.log(`\n⚠️  仍有 ${totalIssues} 个问题需要处理`);
    }
  }
}

// 执行修复
async function main() {
  const fix = new BudgetFixService();
  await fix.runFix();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { BudgetFixService };
