#!/bin/bash

# Docker环境预算修复脚本
# 在Docker容器中运行预算管理系统数据修复

set -e

echo "=== Docker环境预算管理系统数据修复工具 ==="
echo "当前时间: $(date)"

# 检查Docker环境
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误: 请在包含 docker-compose.yml 的目录下运行此脚本"
    exit 1
fi

# 检查容器状态
BACKEND_STATUS=$(docker-compose ps -q backend)
if [ -z "$BACKEND_STATUS" ]; then
    echo "❌ 错误: 后端容器未运行"
    exit 1
fi

# 询问执行模式
echo ""
echo "选择执行模式:"
echo "1. 预览模式 (不会修改数据)"
echo "2. 执行模式 (会修改数据库)"
echo "3. 取消"

read -p "请输入选项 (1-3): " mode

case $mode in
    1)
        DRY_RUN="--dry-run"
        echo "🔍 预览模式: 不会实际修改数据"
        ;;
    2)
        DRY_RUN=""
        echo ""
        echo "⚠️  警告: 这将修改数据库数据!"
        echo "建议先备份数据库:"
        echo "  docker exec zhiweijz-postgres pg_dump -U zhiweijz zhiweijz > backup_\$(date +%Y%m%d_%H%M%S).sql"
        echo ""
        read -p "确认执行数据修复? (y/N): " confirm
        if [[ ! $confirm =~ ^[Yy]$ ]]; then
            echo "已取消操作"
            exit 0
        fi
        echo "🔧 执行模式: 将修改数据库数据"
        ;;
    3)
        echo "已取消操作"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

# 创建修复脚本
TEMP_SCRIPT="/tmp/budget-fix-temp.js"

cat > "$TEMP_SCRIPT" << 'EOF'
/**
 * Docker环境预算修复脚本
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class BudgetFixService {
  constructor() {
    this.currentDate = new Date();
    this.currentYear = this.currentDate.getFullYear();
    this.currentMonth = this.currentDate.getMonth() + 1;
    this.dryRun = process.argv.includes('--dry-run');
  }

  async runFix() {
    console.log('='.repeat(80));
    console.log('Docker环境预算管理系统数据修复');
    console.log(`执行时间: ${new Date().toLocaleString()}`);
    console.log(`当前月份: ${this.currentYear}-${this.currentMonth}`);
    console.log(`模式: ${this.dryRun ? '预览模式 (不会实际修改数据)' : '执行模式'}`);
    console.log('='.repeat(80));

    try {
      await this.fixMissingFamilyMemberBudgets();
      await this.fixBudgetRolloverIssues();
      await this.verifyFixResults();
      
      console.log('\n✅ 修复完成!');
      
    } catch (error) {
      console.error('修复过程中发生错误:', error);
    } finally {
      await prisma.$disconnect();
    }
  }

  async fixMissingFamilyMemberBudgets() {
    console.log('\n🔧 1. 修复缺失的家庭成员预算');
    console.log('-'.repeat(50));

    const currentMonthStart = new Date(this.currentYear, this.currentMonth - 1, 1);
    const currentMonthEnd = new Date(this.currentYear, this.currentMonth, 0);

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

    return Math.max(0, remaining);
  }

  async fixBudgetRolloverIssues() {
    console.log('\n🔄 2. 修复预算结转问题');
    console.log('-'.repeat(50));

    const lastMonth = this.currentMonth === 1 ? 12 : this.currentMonth - 1;
    const lastMonthYear = this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear;
    const lastMonthStart = new Date(lastMonthYear, lastMonth - 1, 1);
    const lastMonthEnd = new Date(lastMonthYear, lastMonth, 0);
    const currentMonthStart = new Date(this.currentYear, this.currentMonth - 1, 1);
    const currentMonthEnd = new Date(this.currentYear, this.currentMonth, 0);

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
      const shouldRollover = await this.calculateRolloverAmount(lastBudget.id);
      
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
      }
    }

    console.log(`\n结转修复统计: ${this.dryRun ? '预计' : '实际'}修复了 ${fixedCount} 个预算的结转金额`);
  }

  async verifyFixResults() {
    console.log('\n✅ 3. 验证修复结果');
    console.log('-'.repeat(50));

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

main().catch(console.error);
EOF

echo ""
echo "🔧 开始运行预算修复..."

# 将脚本复制到容器并执行
docker cp "$TEMP_SCRIPT" zhiweijz-backend:/tmp/budget-fix-temp.js
docker exec zhiweijz-backend node /tmp/budget-fix-temp.js $DRY_RUN

# 清理临时文件
rm -f "$TEMP_SCRIPT"
docker exec zhiweijz-backend rm -f /tmp/budget-fix-temp.js

echo ""
echo "✅ 修复完成"
