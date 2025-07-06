#!/bin/bash

# Docker环境预算诊断脚本
# 在Docker容器中运行预算管理系统诊断

set -e

echo "=== Docker环境预算管理系统诊断工具 ==="
echo "当前时间: $(date)"

# 检查Docker环境
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未找到 Docker 命令"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误: 未找到 docker-compose 命令"
    exit 1
fi

# 检查是否在正确的目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误: 请在包含 docker-compose.yml 的目录下运行此脚本"
    echo "正确的运行方式:"
    echo "  cd docker"
    echo "  bash scripts/budget-diagnosis-docker.sh"
    exit 1
fi

# 检查容器状态
echo ""
echo "🔍 检查容器状态..."
BACKEND_STATUS=$(docker-compose ps -q backend)
if [ -z "$BACKEND_STATUS" ]; then
    echo "❌ 错误: 后端容器未运行"
    echo "请先启动服务: docker-compose up -d"
    exit 1
fi

POSTGRES_STATUS=$(docker-compose ps -q postgres)
if [ -z "$POSTGRES_STATUS" ]; then
    echo "❌ 错误: 数据库容器未运行"
    echo "请先启动服务: docker-compose up -d"
    exit 1
fi

echo "✅ 容器状态正常"

# 创建临时诊断脚本
TEMP_SCRIPT="/tmp/budget-diagnosis-temp.js"

cat > "$TEMP_SCRIPT" << 'EOF'
/**
 * Docker环境预算诊断脚本
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function quickDiagnosis() {
  console.log('🔍 Docker环境预算管理系统快速诊断');
  console.log('='.repeat(50));

  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // 获取当前月份的起止日期
    const currentMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth, 0);

    console.log(`检查期间: ${currentYear}-${currentMonth}`);

    // 1. 基础统计
    const familyAccountBooks = await prisma.accountBook.count({
      where: { type: 'FAMILY' }
    });
    
    const totalFamilyMembers = await prisma.familyMember.count();
    const registeredMembers = await prisma.familyMember.count({
      where: { userId: { not: null }, isCustodial: false }
    });
    const custodialMembers = await prisma.familyMember.count({
      where: { isCustodial: true }
    });

    console.log(`\n📊 基础统计:`);
    console.log(`   家庭账本数量: ${familyAccountBooks}`);
    console.log(`   家庭成员总数: ${totalFamilyMembers}`);
    console.log(`   注册成员: ${registeredMembers}`);
    console.log(`   托管成员: ${custodialMembers}`);

    // 2. 当前月份预算统计
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

    // 3. 定时任务覆盖分析
    const schedulerWouldProcess = await prisma.budget.count({
      where: {
        budgetType: 'PERSONAL',
        period: 'MONTHLY',
        familyMemberId: null,
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

    // 4. 预算结转分析
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

    // 5. 问题识别
    console.log(`\n🚨 问题识别:`);
    
    const issues = [];
    
    if (actualUsersWithBudgets > schedulerWouldProcess) {
      issues.push(`定时任务遗漏 ${actualUsersWithBudgets - schedulerWouldProcess} 个用户的预算创建`);
    }
    
    if (rolloverBudgetsLastMonth > currentBudgetsWithRollover && rolloverBudgetsLastMonth > 0) {
      issues.push(`可能存在预算结转问题，${rolloverBudgetsLastMonth - currentBudgetsWithRollover} 个预算结转可能失败`);
    }

    // 检查家庭账本预算完整性
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

    console.log(`\n💡 建议操作:`);
    if (issues.length > 0) {
      console.log(`   1. 运行详细诊断: docker exec zhiweijz-backend node /tmp/budget-diagnosis-detailed.js`);
      console.log(`   2. 执行数据修复: docker exec zhiweijz-backend node /tmp/budget-fix.js`);
    } else {
      console.log(`   系统运行正常，建议定期检查`);
    }

  } catch (error) {
    console.error('诊断过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickDiagnosis().catch(console.error);
EOF

echo ""
echo "🔍 开始运行预算诊断..."

# 将脚本复制到容器并执行
docker cp "$TEMP_SCRIPT" zhiweijz-backend:/tmp/budget-diagnosis-temp.js
docker exec zhiweijz-backend node /tmp/budget-diagnosis-temp.js

# 清理临时文件
rm -f "$TEMP_SCRIPT"
docker exec zhiweijz-backend rm -f /tmp/budget-diagnosis-temp.js

echo ""
echo "✅ 诊断完成"

# 询问是否需要运行修复
echo ""
read -p "是否需要运行数据修复? (y/N): " run_fix

if [[ $run_fix =~ ^[Yy]$ ]]; then
    echo "准备运行数据修复..."
    bash "$(dirname "$0")/budget-fix-docker.sh"
fi
