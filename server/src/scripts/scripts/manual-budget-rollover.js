"use strict";
/**
 * 手动执行预算结转脚本
 *
 * 功能：
 * 1. 手动执行2025年7月到8月的个人预算结转
 * 2. 为启用结转的预算创建8月份预算
 * 3. 处理缺失的预算结转
 *
 * 使用方法：
 * npx ts-node src/scripts/manual-budget-rollover.ts [--dry-run] [--enable-rollover]
 */
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const budget_service_1 = require("../services/budget.service");
const prisma = new client_1.PrismaClient();
/**
 * 启用指定用户的预算结转功能
 */
async function enableBudgetRollover(userId, accountBookId, dryRun = false) {
    try {
        if (dryRun) {
            console.log(`[试运行] 将为用户 ${userId} 在账本 ${accountBookId} 中启用预算结转`);
            return true;
        }
        // 查找用户的个人预算
        const personalBudgets = await prisma.budget.findMany({
            where: {
                OR: [
                    { userId: userId },
                    { familyMemberId: userId }
                ],
                accountBookId: accountBookId,
                budgetType: client_1.BudgetType.PERSONAL,
                period: client_1.BudgetPeriod.MONTHLY,
                rollover: false
            }
        });
        if (personalBudgets.length === 0) {
            console.log(`用户 ${userId} 没有需要启用结转的个人预算`);
            return false;
        }
        // 启用结转功能
        for (const budget of personalBudgets) {
            await prisma.budget.update({
                where: { id: budget.id },
                data: { rollover: true }
            });
            console.log(`✅ 已为预算 ${budget.name} (${budget.id}) 启用结转功能`);
        }
        return true;
    }
    catch (error) {
        console.error(`❌ 启用用户 ${userId} 预算结转失败:`, error);
        return false;
    }
}
/**
 * 手动执行预算结转
 */
async function manualBudgetRollover(enableRollover = false, dryRun = false) {
    const stats = {
        totalProcessed: 0,
        successfulRollovers: 0,
        skippedBudgets: 0,
        errorsCount: 0,
        budgetsEnabled: 0
    };
    try {
        console.log('🔍 查找2025年7月的个人预算...');
        // 查找2025年7月的个人预算
        const july2025Budgets = await prisma.budget.findMany({
            where: {
                budgetType: client_1.BudgetType.PERSONAL,
                period: client_1.BudgetPeriod.MONTHLY,
                startDate: {
                    gte: new Date('2025-07-01'),
                    lt: new Date('2025-08-01')
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                },
                familyMember: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        console.log(`📊 找到 ${july2025Budgets.length} 个2025年7月的个人预算`);
        stats.totalProcessed = july2025Budgets.length;
        const budgetService = new budget_service_1.BudgetService();
        for (const budget of july2025Budgets) {
            const userInfo = budget.user?.name || budget.user?.email || budget.familyMember?.name || 'Unknown';
            console.log(`\n📝 处理预算: ${budget.name} (用户: ${userInfo})`);
            try {
                // 如果需要启用结转功能
                if (enableRollover && !budget.rollover) {
                    const userId = budget.userId || budget.familyMemberId;
                    if (userId) {
                        const enabled = await enableBudgetRollover(userId, budget.accountBookId || '', dryRun);
                        if (enabled) {
                            stats.budgetsEnabled++;
                        }
                    }
                }
                // 检查是否启用了结转
                const currentBudget = await prisma.budget.findUnique({
                    where: { id: budget.id }
                });
                if (!currentBudget?.rollover) {
                    console.log(`⚠️  预算 ${budget.name} 未启用结转功能，跳过`);
                    stats.skippedBudgets++;
                    continue;
                }
                // 检查是否已有8月份预算
                const august2025Budget = await prisma.budget.findFirst({
                    where: {
                        userId: budget.userId,
                        familyMemberId: budget.familyMemberId,
                        accountBookId: budget.accountBookId,
                        budgetType: client_1.BudgetType.PERSONAL,
                        period: client_1.BudgetPeriod.MONTHLY,
                        startDate: {
                            gte: new Date('2025-08-01'),
                            lt: new Date('2025-09-01')
                        }
                    }
                });
                if (august2025Budget) {
                    console.log(`✅ 已存在8月份预算: ${august2025Budget.name}`);
                    console.log(`   当前结转金额: ${august2025Budget.rolloverAmount || 0}`);
                    stats.successfulRollovers++;
                    continue;
                }
                if (dryRun) {
                    console.log(`[试运行] 将为预算 ${budget.name} 执行结转并创建8月份预算`);
                    stats.successfulRollovers++;
                    continue;
                }
                // 执行结转逻辑
                console.log(`🔄 执行预算结转...`);
                const rolloverAmount = await budgetService.processBudgetRollover(budget.id);
                console.log(`💰 结转金额: ${rolloverAmount}`);
                // 创建8月份预算
                console.log(`📅 创建8月份预算...`);
                await budgetService.autoCreateMissingBudgets(budget.userId || budget.familyMemberId || '', budget.accountBookId || '');
                stats.successfulRollovers++;
                console.log(`✅ 预算 ${budget.name} 结转完成`);
            }
            catch (error) {
                console.error(`❌ 处理预算 ${budget.name} 失败:`, error);
                stats.errorsCount++;
            }
        }
        return stats;
    }
    catch (error) {
        console.error('❌ 手动预算结转失败:', error);
        stats.errorsCount++;
        return stats;
    }
}
/**
 * 主函数
 */
async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const enableRollover = args.includes('--enable-rollover');
    console.log('🚀 开始手动执行预算结转...');
    console.log(`模式: ${dryRun ? '试运行' : '实际执行'}`);
    console.log(`启用结转: ${enableRollover ? '是' : '否'}`);
    console.log('');
    try {
        const stats = await manualBudgetRollover(enableRollover, dryRun);
        console.log('\n===============================');
        console.log('📊 执行结果统计:');
        console.log(`总处理预算数: ${stats.totalProcessed}`);
        console.log(`成功结转: ${stats.successfulRollovers}`);
        console.log(`跳过预算: ${stats.skippedBudgets}`);
        console.log(`启用结转: ${stats.budgetsEnabled}`);
        console.log(`错误数量: ${stats.errorsCount}`);
        console.log('===============================');
        if (dryRun) {
            console.log('\n🔍 这是试运行模式，没有实际修改数据');
            console.log('   如要实际执行，请移除 --dry-run 参数');
        }
        if (enableRollover && !dryRun) {
            console.log('\n💡 建议：重新启动服务器以确保定时任务生效');
        }
    }
    catch (error) {
        console.error('❌ 执行过程中发生错误:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
// 运行主函数
if (require.main === module) {
    main().catch((error) => {
        console.error('❌ 脚本执行失败:', error);
        process.exit(1);
    });
}
