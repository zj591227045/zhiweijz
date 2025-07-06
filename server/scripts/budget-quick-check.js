/**
 * 预算管理系统快速检查脚本
 * 用于快速识别预算创建和结转问题
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function quickCheck() {
  console.log('🔍 预算管理系统快速检查');
  console.log('='.repeat(50));

  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // 获取当前月份的起止日期
    const currentMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth, 0);

    console.log(`检查期间: ${currentYear}-${currentMonth}`);

    // 1. 统计家庭账本数量
    const familyAccountBooks = await prisma.accountBook.count({
      where: { type: 'FAMILY' }
    });
    console.log(`\n📊 家庭账本数量: ${familyAccountBooks}`);

    // 2. 统计家庭成员数量
    const totalFamilyMembers = await prisma.familyMember.count();
    const registeredMembers = await prisma.familyMember.count({
      where: { userId: { not: null }, isCustodial: false }
    });
    const custodialMembers = await prisma.familyMember.count({
      where: { isCustodial: true }
    });

    console.log(`👥 家庭成员统计:`);
    console.log(`   总成员: ${totalFamilyMembers}`);
    console.log(`   注册成员: ${registeredMembers}`);
    console.log(`   托管成员: ${custodialMembers}`);

    // 3. 统计当前月份预算
    const currentMonthBudgets = await prisma.budget.count({
      where: {
        startDate: { gte: currentMonthStart },
        endDate: { lte: currentMonthEnd },
        budgetType: 'PERSONAL'
      }
    });

    const personalBudgets = await prisma.budget.count({
      where: {
        startDate: { gte: currentMonthStart },
        endDate: { lte: currentMonthEnd },
        budgetType: 'PERSONAL',
        familyMemberId: null
      }
    });

    const custodialBudgets = await prisma.budget.count({
      where: {
        startDate: { gte: currentMonthStart },
        endDate: { lte: currentMonthEnd },
        budgetType: 'PERSONAL',
        familyMemberId: { not: null }
      }
    });

    console.log(`\n💰 当前月份预算统计:`);
    console.log(`   总预算数: ${currentMonthBudgets}`);
    console.log(`   个人预算: ${personalBudgets}`);
    console.log(`   托管预算: ${custodialBudgets}`);

    // 4. 检查定时任务覆盖范围
    const schedulerWouldProcess = await prisma.budget.count({
      where: {
        budgetType: 'PERSONAL',
        period: 'MONTHLY',
        familyMemberId: null, // 定时任务的查询条件
      },
      distinct: ['userId', 'accountBookId']
    });

    const actualUsersWithBudgets = await prisma.budget.count({
      where: {
        budgetType: 'PERSONAL',
        period: 'MONTHLY'
      },
      distinct: ['userId', 'accountBookId', 'familyMemberId']
    });

    console.log(`\n⏰ 定时任务覆盖分析:`);
    console.log(`   定时任务会处理: ${schedulerWouldProcess} 个用户`);
    console.log(`   实际应处理: ${actualUsersWithBudgets} 个用户`);
    
    if (actualUsersWithBudgets > schedulerWouldProcess) {
      console.log(`   ❌ 遗漏用户: ${actualUsersWithBudgets - schedulerWouldProcess} 个`);
    } else {
      console.log(`   ✅ 覆盖完整`);
    }

    // 5. 检查结转预算
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const lastMonthStart = new Date(lastMonthYear, lastMonth - 1, 1);
    const lastMonthEnd = new Date(lastMonthYear, lastMonth, 0);

    const rolloverBudgetsLastMonth = await prisma.budget.count({
      where: {
        startDate: { gte: lastMonthStart },
        endDate: { lte: lastMonthEnd },
        rollover: true,
        budgetType: 'PERSONAL'
      }
    });

    const currentBudgetsWithRollover = await prisma.budget.count({
      where: {
        startDate: { gte: currentMonthStart },
        endDate: { lte: currentMonthEnd },
        budgetType: 'PERSONAL',
        rolloverAmount: { gt: 0 }
      }
    });

    console.log(`\n🔄 预算结转分析:`);
    console.log(`   上月启用结转: ${rolloverBudgetsLastMonth} 个预算`);
    console.log(`   当月有结转金额: ${currentBudgetsWithRollover} 个预算`);

    if (rolloverBudgetsLastMonth > currentBudgetsWithRollover) {
      console.log(`   ⚠️  可能的结转问题: ${rolloverBudgetsLastMonth - currentBudgetsWithRollover} 个预算`);
    }

    // 6. 快速问题识别
    console.log(`\n🚨 问题识别:`);
    
    const issues = [];
    
    if (actualUsersWithBudgets > schedulerWouldProcess) {
      issues.push(`定时任务遗漏 ${actualUsersWithBudgets - schedulerWouldProcess} 个用户的预算创建`);
    }
    
    if (rolloverBudgetsLastMonth > currentBudgetsWithRollover && rolloverBudgetsLastMonth > 0) {
      issues.push(`可能存在预算结转问题，${rolloverBudgetsLastMonth - currentBudgetsWithRollover} 个预算结转可能失败`);
    }

    // 检查是否有家庭账本缺少成员预算
    const familyAccountBooksWithMembers = await prisma.accountBook.findMany({
      where: { type: 'FAMILY' },
      include: {
        family: {
          include: {
            members: true
          }
        }
      }
    });

    for (const accountBook of familyAccountBooksWithMembers) {
      if (accountBook.family) {
        const expectedBudgets = accountBook.family.members.filter(m => m.userId || m.isCustodial).length;
        const actualBudgets = await prisma.budget.count({
          where: {
            accountBookId: accountBook.id,
            budgetType: 'PERSONAL',
            startDate: { gte: currentMonthStart },
            endDate: { lte: currentMonthEnd }
          }
        });

        if (actualBudgets < expectedBudgets) {
          issues.push(`家庭账本 "${accountBook.name}" 缺少 ${expectedBudgets - actualBudgets} 个成员预算`);
        }
      }
    }

    if (issues.length === 0) {
      console.log(`   ✅ 未发现明显问题`);
    } else {
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ❌ ${issue}`);
      });
    }

    // 7. 建议操作
    console.log(`\n💡 建议操作:`);
    if (issues.length > 0) {
      console.log(`   1. 运行详细诊断: node server/scripts/budget-diagnosis.js`);
      console.log(`   2. 预览修复操作: node server/scripts/budget-fix.js --dry-run`);
      console.log(`   3. 执行数据修复: node server/scripts/budget-fix.js`);
    } else {
      console.log(`   系统运行正常，建议定期检查`);
    }

  } catch (error) {
    console.error('检查过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行检查
if (require.main === module) {
  quickCheck().catch(console.error);
}

module.exports = { quickCheck };
