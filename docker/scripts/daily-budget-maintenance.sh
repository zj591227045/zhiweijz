#!/bin/bash

# 每日预算维护脚本
# 安全的定期执行脚本，包含幂等性检查，避免重复创建预算
# 建议每天运行一次，确保预算系统正常运行

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/tmp/budget-maintenance-$(date +%Y%m%d).log"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== 开始每日预算维护任务 ==="

# 检查是否在正确的目录
if [ ! -f "docker-compose.yml" ]; then
    log "❌ 错误: 请在包含 docker-compose.yml 的目录下运行此脚本"
    exit 1
fi

# 检查Docker Compose（支持新旧版本）
DOCKER_COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    log "❌ 错误: 未找到 docker compose 或 docker-compose 命令"
    exit 1
fi

# 检查容器状态
log "🔍 检查容器状态..."
BACKEND_STATUS=$($DOCKER_COMPOSE_CMD ps -q backend 2>/dev/null)
if [ -z "$BACKEND_STATUS" ]; then
    # 尝试使用项目名称检查
    BACKEND_STATUS=$($DOCKER_COMPOSE_CMD -p zhiweijz ps -q backend 2>/dev/null)
    if [ -z "$BACKEND_STATUS" ]; then
        log "❌ 错误: 后端容器未运行"
        exit 1
    else
        DOCKER_COMPOSE_CMD="$DOCKER_COMPOSE_CMD -p zhiweijz"
    fi
fi

# 检查后端容器是否真正运行
BACKEND_RUNNING=$(docker inspect --format='{{.State.Running}}' zhiweijz-backend 2>/dev/null)
if [ "$BACKEND_RUNNING" != "true" ]; then
    log "❌ 错误: 后端容器未正常运行"
    exit 1
fi

log "✅ 容器状态正常"

# 创建维护脚本
TEMP_SCRIPT="/tmp/budget-maintenance-temp.js"

cat > "$TEMP_SCRIPT" << 'EOF'
/**
 * 每日预算维护脚本
 * 包含幂等性检查，避免重复创建预算
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class BudgetMaintenanceService {
  constructor() {
    this.currentDate = new Date();
    this.currentYear = this.currentDate.getFullYear();
    this.currentMonth = this.currentDate.getMonth() + 1;
  }

  async runMaintenance() {
    console.log('='.repeat(80));
    console.log('每日预算维护任务');
    console.log(`执行时间: ${new Date().toLocaleString()}`);
    console.log(`当前月份: ${this.currentYear}-${this.currentMonth}`);
    console.log('='.repeat(80));

    try {
      // 1. 检查并创建缺失的预算（幂等性操作）
      await this.checkAndCreateMissingBudgets();
      
      // 2. 验证预算结转状态
      await this.verifyBudgetRollovers();
      
      // 3. 生成维护报告
      await this.generateMaintenanceReport();
      
      console.log('\n✅ 每日维护任务完成!');
      
    } catch (error) {
      console.error('维护任务执行失败:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  async checkAndCreateMissingBudgets() {
    console.log('\n🔧 1. 检查并创建缺失的预算');
    console.log('-'.repeat(50));

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

    let totalChecked = 0;
    let totalCreated = 0;

    for (const accountBook of familyAccountBooks) {
      if (!accountBook.family) continue;

      const allMembers = accountBook.family.members;
      const registeredMembers = allMembers.filter(m => m.userId);
      const custodialMembers = allMembers.filter(m => m.isCustodial);

      console.log(`\n检查家庭账本: ${accountBook.name}`);
      console.log(`  注册成员: ${registeredMembers.length}, 托管成员: ${custodialMembers.length}`);

      // 检查注册成员的预算
      for (const member of registeredMembers) {
        totalChecked++;
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
          // 查找历史预算作为模板
          const templateBudget = await prisma.budget.findFirst({
            where: {
              userId: member.userId,
              accountBookId: accountBook.id,
              budgetType: 'PERSONAL',
              familyMemberId: null
            },
            orderBy: { endDate: 'desc' }
          });

          if (templateBudget) {
            await this.createMemberBudget(member.userId, accountBook, null, member.name, templateBudget);
            totalCreated++;
            console.log(`  ✅ 为 ${member.name} 创建预算`);
          } else {
            console.log(`  ⚠️  ${member.name} 无历史预算，跳过创建`);
          }
        } else {
          console.log(`  ✅ ${member.name} 预算已存在`);
        }
      }

      // 检查托管成员的预算
      for (const member of custodialMembers) {
        totalChecked++;
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
          // 查找历史预算作为模板
          const templateBudget = await prisma.budget.findFirst({
            where: {
              familyMemberId: member.id,
              accountBookId: accountBook.id,
              budgetType: 'PERSONAL'
            },
            orderBy: { endDate: 'desc' }
          });

          if (templateBudget) {
            await this.createMemberBudget(accountBook.userId, accountBook, member.id, member.name, templateBudget);
            totalCreated++;
            console.log(`  ✅ 为托管成员 ${member.name} 创建预算`);
          } else {
            console.log(`  ⚠️  托管成员 ${member.name} 无历史预算，跳过创建`);
          }
        } else {
          console.log(`  ✅ 托管成员 ${member.name} 预算已存在`);
        }
      }
    }

    console.log(`\n维护统计: 检查了 ${totalChecked} 个成员，创建了 ${totalCreated} 个预算`);
  }

  async createMemberBudget(userId, accountBook, familyMemberId, memberName, templateBudget) {
    const currentMonthStart = new Date(this.currentYear, this.currentMonth - 1, 1);
    const currentMonthEnd = new Date(this.currentYear, this.currentMonth, 0);

    // 计算结转金额
    let rolloverAmount = 0;
    if (templateBudget.rollover) {
      rolloverAmount = await this.calculateRolloverAmount(templateBudget.id);
    }

    const budgetData = {
      name: templateBudget.name || '个人预算',
      amount: templateBudget.amount || 0,
      period: 'MONTHLY',
      startDate: currentMonthStart,
      endDate: currentMonthEnd,
      userId: userId,
      familyId: accountBook.familyId,
      accountBookId: accountBook.id,
      rollover: templateBudget.rollover || false,
      rolloverAmount: rolloverAmount,
      enableCategoryBudget: templateBudget.enableCategoryBudget || false,
      isAutoCalculated: templateBudget.isAutoCalculated || false,
      budgetType: 'PERSONAL',
      refreshDay: templateBudget.refreshDay || 1,
      ...(familyMemberId && { familyMemberId })
    };

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

    return remaining; // 返回实际结转金额（可以是负数）
  }

  async verifyBudgetRollovers() {
    console.log('\n🔄 2. 验证预算结转状态');
    console.log('-'.repeat(50));

    // 这里可以添加结转验证逻辑
    console.log('结转验证功能待实现');
  }

  async generateMaintenanceReport() {
    console.log('\n📊 3. 生成维护报告');
    console.log('-'.repeat(50));

    const currentMonthStart = new Date(this.currentYear, this.currentMonth - 1, 1);
    const currentMonthEnd = new Date(this.currentYear, this.currentMonth, 0);

    // 统计当前月份预算
    const totalBudgets = await prisma.budget.count({
      where: {
        startDate: { gte: currentMonthStart },
        endDate: { lte: currentMonthEnd },
        budgetType: 'PERSONAL'
      }
    });

    const familyAccountBooks = await prisma.accountBook.count({
      where: { type: 'FAMILY' }
    });

    const totalMembers = await prisma.familyMember.count();

    console.log(`当前月份预算总数: ${totalBudgets}`);
    console.log(`家庭账本数量: ${familyAccountBooks}`);
    console.log(`家庭成员总数: ${totalMembers}`);
    console.log(`维护时间: ${new Date().toLocaleString()}`);
  }
}

// 执行维护
async function main() {
  const maintenance = new BudgetMaintenanceService();
  await maintenance.runMaintenance();
}

main().catch(console.error);
EOF

log "🔧 开始运行预算维护..."

# 将脚本复制到容器的工作目录并执行
docker cp "$TEMP_SCRIPT" zhiweijz-backend:/app/budget-maintenance-temp.js
docker exec -w /app zhiweijz-backend node budget-maintenance-temp.js

# 清理临时文件
rm -f "$TEMP_SCRIPT"
docker exec zhiweijz-backend rm -f /app/budget-maintenance-temp.js

log "✅ 每日预算维护任务完成"
log "日志文件: $LOG_FILE"
