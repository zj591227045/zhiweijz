import { PrismaClient, BudgetType, BudgetPeriod } from '@prisma/client';
import { BudgetService } from './budget.service';
import { BudgetRepository } from '../repositories/budget.repository';
import { BudgetDateUtils } from '../utils/budget-date-utils';

const prisma = new PrismaClient();

/**
 * 预算定时任务服务
 * 作为自动预算延续的备份机制
 */
export class BudgetSchedulerService {
  private budgetService: BudgetService;
  private budgetRepository: BudgetRepository;

  constructor() {
    this.budgetService = new BudgetService();
    this.budgetRepository = new BudgetRepository();
  }

  /**
   * 每月自动为所有用户创建新月份预算
   * 建议在每月1号凌晨执行
   */
  async createMonthlyBudgetsForAllUsers(): Promise<void> {
    try {
      console.log('开始执行月度预算自动创建任务');
      
      // 获取当前月份
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      console.log(`当前月份: ${currentYear}-${currentMonth}`);
      
      // 查找所有需要创建新预算周期的用户
      const usersNeedingBudgets = await this.findUsersNeedingCurrentPeriodBudgets(currentDate);
      
      console.log(`找到 ${usersNeedingBudgets.length} 个用户需要创建当前月份预算`);
      
      let successCount = 0;
      let errorCount = 0;
      
      // 为每个用户创建预算
      for (const userInfo of usersNeedingBudgets) {
        try {
          await this.budgetService.autoCreateMissingBudgets(userInfo.userId, userInfo.accountBookId);
          successCount++;
          console.log(`成功为用户 ${userInfo.userId} 在账本 ${userInfo.accountBookId} 中创建预算`);
        } catch (error) {
          errorCount++;
          console.error(`为用户 ${userInfo.userId} 创建预算失败:`, error);
        }
      }
      
      console.log(`月度预算创建任务完成: 成功 ${successCount} 个，失败 ${errorCount} 个`);
    } catch (error) {
      console.error('月度预算创建任务执行失败:', error);
    }
  }

  /**
   * 查找需要创建当前预算周期的用户
   * 支持自定义refreshDay的预算周期
   */
  private async findUsersNeedingCurrentPeriodBudgets(currentDate: Date): Promise<Array<{userId: string, accountBookId: string, refreshDay: number}>> {
    // 查找所有有历史预算的用户
    const usersWithHistoricalBudgets = await prisma.budget.findMany({
      where: {
        budgetType: BudgetType.PERSONAL,
        period: BudgetPeriod.MONTHLY,
        familyMemberId: null, // 排除托管成员预算
      },
      select: {
        userId: true,
        accountBookId: true,
        refreshDay: true,
        endDate: true
      },
      distinct: ['userId', 'accountBookId']
    });

    // 过滤出真正需要创建预算的用户
    const usersNeedingBudgets = [];

    for (const userBudget of usersWithHistoricalBudgets) {
      if (!userBudget.userId || !userBudget.accountBookId) continue;

      const refreshDay = userBudget.refreshDay || 1;

      // 计算当前预算周期
      const currentPeriod = BudgetDateUtils.getCurrentBudgetPeriod(currentDate, refreshDay);

      // 检查是否已有当前周期的预算
      const existingCurrentBudget = await prisma.budget.findFirst({
        where: {
          userId: userBudget.userId,
          accountBookId: userBudget.accountBookId,
          budgetType: BudgetType.PERSONAL,
          period: BudgetPeriod.MONTHLY,
          familyMemberId: null,
          startDate: {
            gte: currentPeriod.startDate,
            lte: currentPeriod.endDate
          }
        }
      });

      if (!existingCurrentBudget) {
        usersNeedingBudgets.push({
          userId: userBudget.userId,
          accountBookId: userBudget.accountBookId,
          refreshDay: refreshDay
        });
      }
    }

    return usersNeedingBudgets;
  }

  /**
   * 处理所有过期预算的结转
   * 建议在每月1号执行，处理上个月的预算结转
   */
  async processExpiredBudgetRollovers(): Promise<void> {
    try {
      console.log('开始处理过期预算结转任务');
      
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
      
      // 查找所有上个月结束且启用结转的预算
      const expiredBudgets = await prisma.budget.findMany({
        where: {
          budgetType: BudgetType.PERSONAL,
          period: BudgetPeriod.MONTHLY,
          rollover: true,
          endDate: {
            gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
            lte: lastMonthEnd
          }
        }
      });
      
      console.log(`找到 ${expiredBudgets.length} 个需要处理结转的过期预算`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const budget of expiredBudgets) {
        try {
          await this.budgetService.processBudgetRollover(budget.id);
          successCount++;
          console.log(`成功处理预算 ${budget.id} 的结转`);
        } catch (error) {
          errorCount++;
          console.error(`处理预算 ${budget.id} 结转失败:`, error);
        }
      }
      
      console.log(`预算结转处理任务完成: 成功 ${successCount} 个，失败 ${errorCount} 个`);
    } catch (error) {
      console.error('预算结转处理任务执行失败:', error);
    }
  }

  /**
   * 清理过期的预算历史记录
   * 建议定期执行，清理超过一年的历史记录
   */
  async cleanupOldBudgetHistory(): Promise<void> {
    try {
      console.log('开始清理过期预算历史记录');
      
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const result = await prisma.budgetHistory.deleteMany({
        where: {
          createdAt: {
            lt: oneYearAgo
          }
        }
      });
      
      console.log(`清理了 ${result.count} 条过期预算历史记录`);
    } catch (error) {
      console.error('清理预算历史记录失败:', error);
    }
  }

  /**
   * 执行所有定时任务
   * 可以在cron job中调用此方法
   */
  async runAllScheduledTasks(): Promise<void> {
    console.log('开始执行所有预算定时任务');
    
    // 1. 处理过期预算结转
    await this.processExpiredBudgetRollovers();
    
    // 2. 创建新月份预算
    await this.createMonthlyBudgetsForAllUsers();
    
    // 3. 清理过期历史记录（每月执行一次）
    const currentDate = new Date();
    if (currentDate.getDate() === 1) { // 每月1号执行
      await this.cleanupOldBudgetHistory();
    }
    
    console.log('所有预算定时任务执行完成');
  }
}
