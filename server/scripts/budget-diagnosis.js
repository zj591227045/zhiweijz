/**
 * 预算管理系统问题诊断脚本
 * 用于分析家庭账本成员预算创建失败和预算结转功能失效的问题
 */

const { PrismaClient } = require('@prisma/client');
const dayjs = require('dayjs');

const prisma = new PrismaClient();

class BudgetDiagnosisService {
  constructor() {
    this.currentDate = new Date();
    this.currentYear = this.currentDate.getFullYear();
    this.currentMonth = this.currentDate.getMonth() + 1;
    this.lastMonth = this.currentMonth === 1 ? 12 : this.currentMonth - 1;
    this.lastMonthYear = this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear;
  }

  /**
   * 主诊断函数
   */
  async runDiagnosis() {
    console.log('='.repeat(80));
    console.log('预算管理系统问题诊断报告');
    console.log(`诊断时间: ${new Date().toLocaleString()}`);
    console.log(`当前月份: ${this.currentYear}-${this.currentMonth}`);
    console.log(`上个月份: ${this.lastMonthYear}-${this.lastMonth}`);
    console.log('='.repeat(80));

    try {
      // 1. 分析家庭账本和成员结构
      await this.analyzeFamilyStructure();
      
      // 2. 分析预算创建状态
      await this.analyzeBudgetCreationStatus();
      
      // 3. 分析预算结转状态
      await this.analyzeBudgetRolloverStatus();
      
      // 4. 分析定时任务相关数据
      await this.analyzeSchedulerData();
      
      // 5. 生成修复建议
      await this.generateFixRecommendations();
      
    } catch (error) {
      console.error('诊断过程中发生错误:', error);
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * 分析家庭结构和成员状态
   */
  async analyzeFamilyStructure() {
    console.log('\n📊 1. 家庭结构分析');
    console.log('-'.repeat(50));

    // 查询所有家庭账本
    const familyAccountBooks = await prisma.accountBook.findMany({
      where: { type: 'FAMILY' },
      include: {
        family: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        }
      }
    });

    console.log(`总家庭账本数量: ${familyAccountBooks.length}`);

    for (const accountBook of familyAccountBooks) {
      console.log(`\n家庭账本: ${accountBook.name} (${accountBook.id})`);
      console.log(`  创建者: ${accountBook.userId}`);
      console.log(`  家庭ID: ${accountBook.familyId}`);
      
      if (accountBook.family) {
        console.log(`  家庭成员总数: ${accountBook.family.members.length}`);
        
        const membersByType = {
          registered: accountBook.family.members.filter(m => m.userId && !m.isCustodial),
          custodial: accountBook.family.members.filter(m => m.isCustodial),
          unregistered: accountBook.family.members.filter(m => !m.userId && !m.isCustodial)
        };

        console.log(`  - 注册用户: ${membersByType.registered.length}`);
        console.log(`  - 托管用户: ${membersByType.custodial.length}`);
        console.log(`  - 未注册用户: ${membersByType.unregistered.length}`);

        // 详细列出每个成员
        for (const member of accountBook.family.members) {
          const type = member.isCustodial ? '托管' : (member.userId ? '注册' : '未注册');
          const userInfo = member.user ? `(${member.user.name})` : '';
          console.log(`    ${member.name} [${type}] ${userInfo} - ID: ${member.id}`);
        }
      }
    }
  }

  /**
   * 分析预算创建状态
   */
  async analyzeBudgetCreationStatus() {
    console.log('\n📈 2. 预算创建状态分析');
    console.log('-'.repeat(50));

    // 获取当前月份的起止日期
    const currentMonthStart = new Date(this.currentYear, this.currentMonth - 1, 1);
    const currentMonthEnd = new Date(this.currentYear, this.currentMonth, 0);

    console.log(`分析期间: ${currentMonthStart.toISOString().split('T')[0]} 到 ${currentMonthEnd.toISOString().split('T')[0]}`);

    // 查询当前月份的所有预算
    const currentMonthBudgets = await prisma.budget.findMany({
      where: {
        startDate: { gte: currentMonthStart },
        endDate: { lte: currentMonthEnd },
        budgetType: 'PERSONAL'
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        familyMember: { select: { id: true, name: true, isCustodial: true } },
        accountBook: { select: { id: true, name: true, type: true, familyId: true } }
      },
      orderBy: [
        { accountBookId: 'asc' },
        { userId: 'asc' }
      ]
    });

    console.log(`\n当前月份预算总数: ${currentMonthBudgets.length}`);

    // 按账本分组分析
    const budgetsByAccountBook = {};
    for (const budget of currentMonthBudgets) {
      const accountBookId = budget.accountBookId;
      if (!budgetsByAccountBook[accountBookId]) {
        budgetsByAccountBook[accountBookId] = [];
      }
      budgetsByAccountBook[accountBookId].push(budget);
    }

    // 分析每个家庭账本的预算创建情况
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

    for (const accountBook of familyAccountBooks) {
      console.log(`\n📋 家庭账本: ${accountBook.name} (${accountBook.id})`);
      
      const accountBookBudgets = budgetsByAccountBook[accountBook.id] || [];
      console.log(`  当前月份预算数量: ${accountBookBudgets.length}`);

      if (accountBook.family) {
        const allMembers = accountBook.family.members;
        const registeredMembers = allMembers.filter(m => m.userId);
        const custodialMembers = allMembers.filter(m => m.isCustodial);

        console.log(`  应有预算数量: ${registeredMembers.length + custodialMembers.length}`);
        console.log(`  实际预算数量: ${accountBookBudgets.length}`);
        
        if (accountBookBudgets.length < registeredMembers.length + custodialMembers.length) {
          console.log(`  ⚠️  预算缺失! 缺少 ${registeredMembers.length + custodialMembers.length - accountBookBudgets.length} 个预算`);
        }

        // 检查每个注册成员的预算
        console.log(`\n  注册成员预算状态:`);
        for (const member of registeredMembers) {
          const memberBudget = accountBookBudgets.find(b => b.userId === member.userId && !b.familyMemberId);
          if (memberBudget) {
            console.log(`    ✅ ${member.name} (${member.user?.name}) - 预算ID: ${memberBudget.id}`);
          } else {
            console.log(`    ❌ ${member.name} (${member.user?.name}) - 缺少预算`);
          }
        }

        // 检查每个托管成员的预算
        console.log(`\n  托管成员预算状态:`);
        for (const member of custodialMembers) {
          const memberBudget = accountBookBudgets.find(b => b.familyMemberId === member.id);
          if (memberBudget) {
            console.log(`    ✅ ${member.name} - 预算ID: ${memberBudget.id}`);
          } else {
            console.log(`    ❌ ${member.name} - 缺少预算`);
          }
        }
      }
    }
  }

  /**
   * 分析预算结转状态
   */
  async analyzeBudgetRolloverStatus() {
    console.log('\n🔄 3. 预算结转状态分析');
    console.log('-'.repeat(50));

    // 获取上个月的起止日期
    const lastMonthStart = new Date(this.lastMonthYear, this.lastMonth - 1, 1);
    const lastMonthEnd = new Date(this.lastMonthYear, this.lastMonth, 0);

    console.log(`上月期间: ${lastMonthStart.toISOString().split('T')[0]} 到 ${lastMonthEnd.toISOString().split('T')[0]}`);

    // 查询上个月启用结转的预算
    const lastMonthRolloverBudgets = await prisma.budget.findMany({
      where: {
        startDate: { gte: lastMonthStart },
        endDate: { lte: lastMonthEnd },
        rollover: true,
        budgetType: 'PERSONAL'
      },
      include: {
        user: { select: { id: true, name: true } },
        familyMember: { select: { id: true, name: true, isCustodial: true } },
        accountBook: { select: { id: true, name: true, type: true } }
      }
    });

    console.log(`\n上月启用结转的预算数量: ${lastMonthRolloverBudgets.length}`);

    // 获取当前月份的起止日期
    const currentMonthStart = new Date(this.currentYear, this.currentMonth - 1, 1);
    const currentMonthEnd = new Date(this.currentYear, this.currentMonth, 0);

    for (const lastBudget of lastMonthRolloverBudgets) {
      console.log(`\n📊 预算: ${lastBudget.name} (${lastBudget.id})`);
      console.log(`  账本: ${lastBudget.accountBook?.name}`);
      console.log(`  用户: ${lastBudget.user?.name || '托管用户'}`);
      console.log(`  上月金额: ${lastBudget.amount}`);
      console.log(`  上月结转金额: ${lastBudget.rolloverAmount || 0}`);

      // 计算上月实际支出
      const lastMonthSpent = await this.calculateBudgetSpent(lastBudget.id);
      const totalAvailable = Number(lastBudget.amount) + Number(lastBudget.rolloverAmount || 0);
      const shouldRollover = totalAvailable - lastMonthSpent;
      
      console.log(`  上月支出: ${lastMonthSpent}`);
      console.log(`  应结转金额: ${shouldRollover}`);

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
        console.log(`  ✅ 找到当月预算: ${currentBudget.id}`);
        console.log(`  当月基础金额: ${currentBudget.amount}`);
        console.log(`  当月结转金额: ${currentBudget.rolloverAmount || 0}`);
        
        if (shouldRollover > 0 && Number(currentBudget.rolloverAmount || 0) !== shouldRollover) {
          console.log(`  ⚠️  结转金额不匹配! 期望: ${shouldRollover}, 实际: ${currentBudget.rolloverAmount || 0}`);
        } else if (shouldRollover > 0) {
          console.log(`  ✅ 结转金额正确`);
        }
      } else {
        console.log(`  ❌ 未找到对应的当月预算`);
      }
    }
  }

  /**
   * 计算预算的实际支出
   */
  async calculateBudgetSpent(budgetId) {
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId }
    });

    if (!budget) return 0;

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

  /**
   * 分析定时任务相关数据
   */
  async analyzeSchedulerData() {
    console.log('\n⏰ 4. 定时任务数据分析');
    console.log('-'.repeat(50));

    // 查询需要创建预算的用户（模拟定时任务逻辑）
    const usersWithHistoricalBudgets = await prisma.budget.findMany({
      where: {
        budgetType: 'PERSONAL',
        period: 'MONTHLY',
        familyMemberId: null, // 这里是问题所在！
      },
      select: {
        userId: true,
        accountBookId: true,
        refreshDay: true,
        endDate: true
      },
      distinct: ['userId', 'accountBookId']
    });

    console.log(`定时任务会处理的用户数量: ${usersWithHistoricalBudgets.length}`);
    console.log('⚠️  注意: 定时任务只查询 familyMemberId: null 的预算，这排除了托管用户!');

    // 查询所有有历史预算的用户（包括托管用户）
    const allUsersWithBudgets = await prisma.budget.findMany({
      where: {
        budgetType: 'PERSONAL',
        period: 'MONTHLY'
      },
      select: {
        userId: true,
        accountBookId: true,
        familyMemberId: true,
        refreshDay: true,
        endDate: true
      },
      distinct: ['userId', 'accountBookId', 'familyMemberId']
    });

    console.log(`实际应处理的用户数量: ${allUsersWithBudgets.length}`);
    console.log(`被遗漏的用户数量: ${allUsersWithBudgets.length - usersWithHistoricalBudgets.length}`);

    // 分析被遗漏的用户
    const missedUsers = allUsersWithBudgets.filter(all => 
      !usersWithHistoricalBudgets.some(scheduled => 
        scheduled.userId === all.userId && 
        scheduled.accountBookId === all.accountBookId
      )
    );

    if (missedUsers.length > 0) {
      console.log('\n被定时任务遗漏的用户:');
      for (const missed of missedUsers) {
        if (missed.familyMemberId) {
          const familyMember = await prisma.familyMember.findUnique({
            where: { id: missed.familyMemberId },
            select: { name: true, isCustodial: true }
          });
          console.log(`  托管用户: ${familyMember?.name} (${missed.familyMemberId})`);
        } else {
          const user = await prisma.user.findUnique({
            where: { id: missed.userId },
            select: { name: true }
          });
          console.log(`  注册用户: ${user?.name} (${missed.userId})`);
        }
      }
    }
  }

  /**
   * 生成修复建议
   */
  async generateFixRecommendations() {
    console.log('\n🔧 5. 修复建议');
    console.log('-'.repeat(50));

    console.log(`
修复建议:

1. 【定时任务修复】修改 budget-scheduler.service.ts 中的 findUsersNeedingCurrentPeriodBudgets 方法:
   - 移除 familyMemberId: null 的限制条件
   - 分别处理注册用户和托管用户的预算创建

2. 【预算结转修复】确保预算结转逻辑正确执行:
   - 检查 processBudgetRollover 方法是否正确计算结转金额
   - 确保新预算创建时正确设置 rolloverAmount

3. 【数据修复】为缺失预算的用户手动创建预算:
   - 运行修复脚本为所有缺失预算的家庭成员创建当月预算
   - 重新计算和应用预算结转

4. 【监控改进】添加预算创建监控:
   - 记录定时任务执行日志
   - 添加预算创建失败的告警机制

建议执行顺序:
1. 先修复代码逻辑
2. 运行数据修复脚本
3. 验证修复结果
4. 部署监控机制
`);
  }
}

// 执行诊断
async function main() {
  const diagnosis = new BudgetDiagnosisService();
  await diagnosis.runDiagnosis();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { BudgetDiagnosisService };
