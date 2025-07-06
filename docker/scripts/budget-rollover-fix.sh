#!/bin/bash

# 预算结转专用修复脚本
# 专门针对预算结转问题的诊断和修复工具

set -e

echo "=== 预算结转专用修复工具 ==="
echo "当前时间: $(date)"

# 检查是否在正确的目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误: 请在包含 docker-compose.yml 的目录下运行此脚本"
    exit 1
fi

# 检查Docker Compose（支持新旧版本）
DOCKER_COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "❌ 错误: 未找到 docker compose 或 docker-compose 命令"
    exit 1
fi

# 检查容器状态
echo "🔍 检查容器状态..."
BACKEND_STATUS=$($DOCKER_COMPOSE_CMD ps -q backend 2>/dev/null)
if [ -z "$BACKEND_STATUS" ]; then
    BACKEND_STATUS=$($DOCKER_COMPOSE_CMD -p zhiweijz ps -q backend 2>/dev/null)
    if [ -z "$BACKEND_STATUS" ]; then
        echo "❌ 错误: 后端容器未运行"
        exit 1
    else
        DOCKER_COMPOSE_CMD="$DOCKER_COMPOSE_CMD -p zhiweijz"
    fi
fi

BACKEND_RUNNING=$(docker inspect --format='{{.State.Running}}' zhiweijz-backend 2>/dev/null)
if [ "$BACKEND_RUNNING" != "true" ]; then
    echo "❌ 错误: 后端容器未正常运行"
    exit 1
fi

echo "✅ 容器状态正常"

# 询问执行模式
echo ""
echo "选择执行模式:"
echo "1. 诊断模式 (分析预算结转问题)"
echo "2. 修复模式 (修复结转金额和历史记录)"
echo "3. 重新计算模式 (重新计算所有结转)"
echo "4. 退出"

read -p "请输入选项 (1-4): " mode

case $mode in
    1)
        MODE="diagnose"
        echo "🔍 诊断模式: 分析预算结转问题"
        ;;
    2)
        MODE="fix"
        echo "🔧 修复模式: 修复结转金额和历史记录"
        ;;
    3)
        MODE="recalculate"
        echo "🔄 重新计算模式: 重新计算所有结转"
        echo ""
        echo "⚠️  警告: 这将重新计算所有预算的结转金额!"
        read -p "确认执行? (y/N): " confirm
        if [[ ! $confirm =~ ^[Yy]$ ]]; then
            echo "已取消操作"
            exit 0
        fi
        ;;
    4)
        echo "退出"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

# 创建预算结转修复脚本
TEMP_SCRIPT="/tmp/budget-rollover-fix-temp.js"

cat > "$TEMP_SCRIPT" << EOF
/**
 * 预算结转专用修复脚本
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class BudgetRolloverFixService {
  constructor() {
    this.currentDate = new Date();
    this.currentYear = this.currentDate.getFullYear();
    this.currentMonth = this.currentDate.getMonth() + 1;
    this.lastMonth = this.currentMonth === 1 ? 12 : this.currentMonth - 1;
    this.lastMonthYear = this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear;
    this.mode = process.argv[2] || 'diagnose';
  }

  async run() {
    console.log('='.repeat(80));
    console.log('预算结转专用修复工具');
    console.log(\`执行时间: \${new Date().toLocaleString()}\`);
    console.log(\`当前月份: \${this.currentYear}-\${this.currentMonth}\`);
    console.log(\`上个月份: \${this.lastMonthYear}-\${this.lastMonth}\`);
    console.log(\`执行模式: \${this.mode}\`);
    console.log('='.repeat(80));

    try {
      switch (this.mode) {
        case 'diagnose':
          await this.diagnoseRolloverIssues();
          break;
        case 'fix':
          await this.fixRolloverIssues();
          break;
        case 'recalculate':
          await this.recalculateAllRollovers();
          break;
        default:
          console.error('未知的执行模式:', this.mode);
      }
    } catch (error) {
      console.error('执行失败:', error);
    } finally {
      await prisma.\$disconnect();
    }
  }

  async diagnoseRolloverIssues() {
    console.log('\\n🔍 1. 诊断预算结转问题');
    console.log('-'.repeat(50));

    // 获取上个月启用结转的预算
    const lastMonthStart = new Date(this.lastMonthYear, this.lastMonth - 1, 1);
    const lastMonthEnd = new Date(this.lastMonthYear, this.lastMonth, 0);

    const rolloverBudgets = await prisma.budget.findMany({
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

    console.log(\`找到 \${rolloverBudgets.length} 个启用结转的上月预算\`);

    let issueCount = 0;
    const issues = [];

    for (const budget of rolloverBudgets) {
      console.log(\`\\n📊 分析预算: \${budget.name} (\${budget.id})\`);
      console.log(\`  账本: \${budget.accountBook?.name}\`);
      console.log(\`  用户: \${budget.user?.name || '托管用户'}\`);
      console.log(\`  上月金额: \${budget.amount}\`);
      console.log(\`  上月结转金额: \${budget.rolloverAmount || 0}\`);

      // 计算实际支出
      const spent = await this.calculateBudgetSpent(budget);
      const totalAvailable = Number(budget.amount) + Number(budget.rolloverAmount || 0);
      const shouldRollover = totalAvailable - spent;

      console.log(\`  实际支出: \${spent}\`);
      console.log(\`  应结转金额: \${shouldRollover}\`);

      // 查找对应的当月预算
      const currentBudget = await this.findCurrentMonthBudget(budget);

      if (currentBudget) {
        console.log(\`  ✅ 找到当月预算: \${currentBudget.id}\`);
        console.log(\`  当月基础金额: \${currentBudget.amount}\`);
        console.log(\`  当月结转金额: \${currentBudget.rolloverAmount || 0}\`);

        const currentRollover = Number(currentBudget.rolloverAmount || 0);
        if (Math.abs(currentRollover - shouldRollover) > 0.01) {
          issueCount++;
          const issue = {
            type: 'ROLLOVER_AMOUNT_MISMATCH',
            lastBudgetId: budget.id,
            currentBudgetId: currentBudget.id,
            expected: shouldRollover,
            actual: currentRollover,
            difference: shouldRollover - currentRollover
          };
          issues.push(issue);
          console.log(\`  ❌ 结转金额不匹配! 期望: \${shouldRollover}, 实际: \${currentRollover}, 差异: \${issue.difference}\`);
        } else {
          console.log(\`  ✅ 结转金额正确\`);
        }
      } else {
        issueCount++;
        const issue = {
          type: 'MISSING_CURRENT_BUDGET',
          lastBudgetId: budget.id,
          shouldRollover: shouldRollover
        };
        issues.push(issue);
        console.log(\`  ❌ 未找到对应的当月预算\`);
      }
    }

    console.log(\`\\n📋 诊断总结:\`);
    console.log(\`  检查的预算数量: \${rolloverBudgets.length}\`);
    console.log(\`  发现的问题数量: \${issueCount}\`);

    if (issues.length > 0) {
      console.log(\`\\n🚨 发现的问题:\`);
      issues.forEach((issue, index) => {
        console.log(\`  \${index + 1}. \${issue.type}\`);
        if (issue.type === 'ROLLOVER_AMOUNT_MISMATCH') {
          console.log(\`     预算ID: \${issue.currentBudgetId}\`);
          console.log(\`     差异: \${issue.difference}\`);
        } else if (issue.type === 'MISSING_CURRENT_BUDGET') {
          console.log(\`     上月预算ID: \${issue.lastBudgetId}\`);
          console.log(\`     应结转金额: \${issue.shouldRollover}\`);
        }
      });

      console.log(\`\\n💡 建议操作:\`);
      console.log(\`  1. 运行修复模式: bash scripts/budget-rollover-fix.sh (选择修复模式)\`);
      console.log(\`  2. 运行重新计算模式: bash scripts/budget-rollover-fix.sh (选择重新计算模式)\`);
    } else {
      console.log(\`\\n🎉 所有预算结转都正确!\`);
    }
  }

  async calculateBudgetSpent(budget) {
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

    return await prisma.budget.findFirst({ where: query });
  }

  async fixRolloverIssues() {
    console.log('\\n🔧 2. 修复预算结转问题');
    console.log('-'.repeat(50));

    const lastMonthStart = new Date(this.lastMonthYear, this.lastMonth - 1, 1);
    const lastMonthEnd = new Date(this.lastMonthYear, this.lastMonth, 0);

    const rolloverBudgets = await prisma.budget.findMany({
      where: {
        startDate: { gte: lastMonthStart },
        endDate: { lte: lastMonthEnd },
        rollover: true,
        budgetType: 'PERSONAL'
      }
    });

    let fixedCount = 0;
    let errorCount = 0;

    for (const budget of rolloverBudgets) {
      try {
        const spent = await this.calculateBudgetSpent(budget);
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

            // 记录修复历史
            await this.recordRolloverHistory(budget, currentBudget, shouldRollover, 'FIXED');

            fixedCount++;
            console.log(\`✅ 修复预算 \${currentBudget.id}: \${currentRollover} → \${shouldRollover}\`);
          }
        }
      } catch (error) {
        errorCount++;
        console.error(\`❌ 修复预算 \${budget.id} 失败:\`, error.message);
      }
    }

    console.log(\`\\n修复统计: 成功修复 \${fixedCount} 个预算，失败 \${errorCount} 个\`);
  }

  async recalculateAllRollovers() {
    console.log('\\n🔄 3. 重新计算所有预算结转');
    console.log('-'.repeat(50));

    // 获取所有启用结转的预算（按时间顺序）
    const allRolloverBudgets = await prisma.budget.findMany({
      where: {
        rollover: true,
        budgetType: 'PERSONAL'
      },
      orderBy: [
        { accountBookId: 'asc' },
        { userId: 'asc' },
        { familyMemberId: 'asc' },
        { startDate: 'asc' }
      ]
    });

    console.log(\`找到 \${allRolloverBudgets.length} 个启用结转的预算\`);

    // 按用户和账本分组
    const budgetGroups = {};
    for (const budget of allRolloverBudgets) {
      const key = \`\${budget.accountBookId}_\${budget.userId}_\${budget.familyMemberId || 'null'}\`;
      if (!budgetGroups[key]) {
        budgetGroups[key] = [];
      }
      budgetGroups[key].push(budget);
    }

    let recalculatedCount = 0;

    for (const [key, budgets] of Object.entries(budgetGroups)) {
      console.log(\`\\n重新计算预算组: \${key}\`);

      // 按时间顺序重新计算结转链
      let previousRollover = 0;

      for (let i = 0; i < budgets.length; i++) {
        const budget = budgets[i];
        const spent = await this.calculateBudgetSpent(budget);
        const totalAvailable = Number(budget.amount) + previousRollover;
        const newRollover = totalAvailable - spent;

        // 更新当前预算的结转金额
        if (Math.abs(Number(budget.rolloverAmount || 0) - previousRollover) > 0.01) {
          await prisma.budget.update({
            where: { id: budget.id },
            data: { rolloverAmount: previousRollover }
          });
        }

        // 记录重新计算历史
        await this.recordRolloverHistory(budget, budget, newRollover, 'RECALCULATED');

        console.log(\`  预算 \${budget.id}: 基础=\${budget.amount}, 结转=\${previousRollover}, 支出=\${spent}, 新结转=\${newRollover}\`);

        previousRollover = newRollover;
        recalculatedCount++;
      }
    }

    console.log(\`\\n重新计算统计: 处理了 \${recalculatedCount} 个预算\`);
  }

  async recordRolloverHistory(fromBudget, toBudget, rolloverAmount, action) {
    try {
      const rolloverType = rolloverAmount >= 0 ? 'SURPLUS' : 'DEFICIT';
      const description = \`\${action}: 从预算 \${fromBudget.id} 到预算 \${toBudget.id}, 金额: \${rolloverAmount}\`;

      // 保存到数据库历史表
      const historyRecord = await prisma.budgetHistory.create({
        data: {
          budgetId: toBudget.id,
          period: \`\${toBudget.endDate.getFullYear()}-\${toBudget.endDate.getMonth() + 1}\`,
          amount: rolloverAmount,
          type: rolloverType,
          description: description,
          budgetAmount: toBudget.amount,
          spentAmount: null,
          previousRollover: fromBudget.rolloverAmount || 0,
          userId: toBudget.userId,
          accountBookId: toBudget.accountBookId,
          budgetType: toBudget.budgetType || 'PERSONAL'
        }
      });

      console.log(\`✅ 记录结转历史成功: \${action} - 历史ID: \${historyRecord.id}, 金额: \${rolloverAmount}\`);

    } catch (error) {
      console.error('记录结转历史失败:', error);
    }
  }

  async generateRolloverReport() {
    console.log('\\n📊 4. 生成预算结转报告');
    console.log('-'.repeat(50));

    const currentMonthStart = new Date(this.currentYear, this.currentMonth - 1, 1);
    const currentMonthEnd = new Date(this.currentYear, this.currentMonth, 0);

    // 统计当前月份的结转情况
    const rolloverHistories = await prisma.budgetHistory.findMany({
      where: {
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd
        },
        type: { in: ['SURPLUS', 'DEFICIT'] }
      },
      include: {
        budget: {
          select: { name: true }
        },
        user: {
          select: { name: true }
        },
        accountBook: {
          select: { name: true }
        }
      }
    });

    const surplusCount = rolloverHistories.filter(h => h.type === 'SURPLUS').length;
    const deficitCount = rolloverHistories.filter(h => h.type === 'DEFICIT').length;
    const totalSurplus = rolloverHistories
      .filter(h => h.type === 'SURPLUS')
      .reduce((sum, h) => sum + Number(h.amount), 0);
    const totalDeficit = rolloverHistories
      .filter(h => h.type === 'DEFICIT')
      .reduce((sum, h) => sum + Math.abs(Number(h.amount)), 0);

    console.log(\`当前月份结转统计:\`);
    console.log(\`  余额结转: \${surplusCount} 笔, 总金额: \${totalSurplus}\`);
    console.log(\`  债务结转: \${deficitCount} 笔, 总金额: \${totalDeficit}\`);
    console.log(\`  净结转: \${totalSurplus - totalDeficit}\`);

    if (rolloverHistories.length > 0) {
      console.log(\`\\n最近的结转记录:\`);
      rolloverHistories.slice(0, 5).forEach(history => {
        const type = history.type === 'SURPLUS' ? '余额' : '债务';
        console.log(\`  \${type}结转: \${history.amount} - \${history.budget?.name} (\${history.accountBook?.name})\`);
      });
    }
  }
}

// 执行修复
async function main() {
  const service = new BudgetRolloverFixService();
  await service.run();
}

main().catch(console.error);
EOF

echo ""
echo "🔧 开始运行预算结转修复..."

# 将脚本复制到容器的工作目录并执行
docker cp "$TEMP_SCRIPT" zhiweijz-backend:/app/budget-rollover-fix-temp.js
docker exec -w /app zhiweijz-backend node budget-rollover-fix-temp.js "$MODE"

# 清理临时文件
rm -f "$TEMP_SCRIPT"
docker exec zhiweijz-backend rm -f /app/budget-rollover-fix-temp.js

echo ""
echo "✅ 预算结转修复完成"
