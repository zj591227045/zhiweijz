// 定义枚举
enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

enum BudgetPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}
import { PrismaClient } from '@prisma/client';
import { TransactionRepository } from '../repositories/transaction.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { BudgetRepository } from '../repositories/budget.repository';
import { FamilyRepository } from '../repositories/family.repository';
import { toCategoryResponseDto } from '../models/category.model';

// 创建Prisma客户端实例
const prisma = new PrismaClient();

/**
 * 支出统计响应DTO
 */
export interface ExpenseStatisticsResponseDto {
  total: number;
  data: Array<{
    date: string;
    amount: number;
  }>;
  byCategory: Array<{
    category: {
      id: string;
      name: string;
      icon?: string;
    };
    amount: number;
    percentage: number;
  }>;
}

/**
 * 收入统计响应DTO
 */
export interface IncomeStatisticsResponseDto {
  total: number;
  data: Array<{
    date: string;
    amount: number;
  }>;
  byCategory: Array<{
    category: {
      id: string;
      name: string;
      icon?: string;
    };
    amount: number;
    percentage: number;
  }>;
}

/**
 * 预算执行情况响应DTO
 */
export interface BudgetStatisticsResponseDto {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentage: number;
  categories: Array<{
    category: {
      id: string;
      name: string;
      icon?: string;
    };
    budget: number;
    spent: number;
    remaining: number;
    percentage: number;
  }>;
  // 添加最近记账记录
  recentTransactions?: Array<{
    id: string;
    title: string;
    amount: number;
    date: string;
    categoryId: string;
    categoryName: string;
    categoryIcon?: string;
    type: string;
  }>;
}

/**
 * 财务概览响应DTO
 */
export interface FinancialOverviewResponseDto {
  income: number;
  expense: number;
  netIncome: number;
  topIncomeCategories: Array<{
    category: {
      id: string;
      name: string;
      icon?: string;
    };
    amount: number;
    percentage: number;
  }>;
  topExpenseCategories: Array<{
    category: {
      id: string;
      name: string;
      icon?: string;
    };
    amount: number;
    percentage: number;
  }>;
  dailyStatistics: Array<{
    date: string;
    income: number;
    expense: number;
  }>;
}

/**
 * 统计分析服务
 */
export class StatisticsService {
  private transactionRepository: TransactionRepository;
  private categoryRepository: CategoryRepository;
  private budgetRepository: BudgetRepository;
  private familyRepository: FamilyRepository;

  constructor() {
    this.transactionRepository = new TransactionRepository();
    this.categoryRepository = new CategoryRepository();
    this.budgetRepository = new BudgetRepository();
    this.familyRepository = new FamilyRepository();
  }

  /**
   * 获取支出统计
   */
  async getExpenseStatistics(
    userId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' | 'category' = 'day',
    familyId?: string,
    accountBookId?: string,
  ): Promise<ExpenseStatisticsResponseDto> {
    // 验证用户是否为家庭成员
    if (familyId) {
      const isMember = await this.isUserFamilyMember(userId, familyId);
      if (!isMember) {
        throw new Error('无权访问此家庭数据');
      }
    }

    // 获取记账记录 - 不排除家庭成员的记账记录，统计该账本的所有记账
    const transactions = await this.transactionRepository.findByDateRange(
      userId,
      TransactionType.EXPENSE,
      startDate,
      endDate,
      familyId,
      accountBookId,
      false, // 设置excludeFamilyMember为false，统计该账本的所有记账记录
    );

    // 获取分类信息
    const categories = await this.getCategoriesMap(userId, familyId);

    // 计算总支出
    const total = transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    // 按日期分组
    const dataByDate = this.groupTransactionsByDate(transactions, groupBy);

    // 按分类分组
    const dataByCategory = this.groupTransactionsByCategory(transactions, categories, total);

    return {
      total,
      data: dataByDate,
      byCategory: dataByCategory,
    };
  }

  /**
   * 获取收入统计
   */
  async getIncomeStatistics(
    userId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' | 'category' = 'day',
    familyId?: string,
    accountBookId?: string,
  ): Promise<IncomeStatisticsResponseDto> {
    // 验证用户是否为家庭成员
    if (familyId) {
      const isMember = await this.isUserFamilyMember(userId, familyId);
      if (!isMember) {
        throw new Error('无权访问此家庭数据');
      }
    }

    // 获取记账记录 - 不排除家庭成员的记账记录，统计该账本的所有记账
    const transactions = await this.transactionRepository.findByDateRange(
      userId,
      TransactionType.INCOME,
      startDate,
      endDate,
      familyId,
      accountBookId,
      false, // 设置excludeFamilyMember为false，统计该账本的所有记账记录
    );

    // 获取分类信息
    const categories = await this.getCategoriesMap(userId, familyId);

    // 计算总收入
    const total = transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    // 按日期分组
    const dataByDate = this.groupTransactionsByDate(transactions, groupBy);

    // 按分类分组
    const dataByCategory = this.groupTransactionsByCategory(transactions, categories, total);

    return {
      total,
      data: dataByDate,
      byCategory: dataByCategory,
    };
  }

  /**
   * 获取预算执行情况
   */
  async getBudgetStatistics(
    userId: string,
    month: string,
    familyId?: string,
    accountBookId?: string,
    budgetType?: 'PERSONAL' | 'GENERAL',
  ): Promise<any> {
    // 修改返回类型为any，以便返回扩展的数据
    console.log('StatisticsService.getBudgetStatistics 参数:', {
      userId,
      month,
      familyId,
      accountBookId,
      budgetType,
    });

    // 验证用户是否为家庭成员
    if (familyId) {
      const isMember = await this.isUserFamilyMember(userId, familyId);
      if (!isMember) {
        throw new Error('无权访问此家庭数据');
      }
    }

    // 验证用户是否有权访问账本
    let accountBook;
    if (accountBookId) {
      try {
        // 导入AccountBookRepository
        const { AccountBookRepository } = require('../repositories/account-book.repository');
        const accountBookRepository = new AccountBookRepository();

        // 查找账本
        accountBook = await accountBookRepository.findById(accountBookId);
        console.log('查找账本结果:', accountBook);

        if (!accountBook) {
          throw new Error('账本不存在');
        }

        // 验证权限
        if (accountBook.type === 'PERSONAL') {
          // 个人账本只能被创建者访问
          if (accountBook.userId !== userId) {
            console.error('个人账本权限验证失败:', {
              accountBookUserId: accountBook.userId,
              requestUserId: userId,
            });
            throw new Error('无权访问此账本');
          }
        } else if (accountBook.type === 'FAMILY') {
          // 家庭账本可以被家庭成员访问
          if (!accountBook.familyId) {
            throw new Error('账本数据错误：家庭账本缺少家庭ID');
          }

          const isMember = await this.isUserFamilyMember(userId, accountBook.familyId);
          if (!isMember) {
            console.error('家庭账本权限验证失败:', {
              familyId: accountBook.familyId,
              requestUserId: userId,
            });
            throw new Error('无权访问此家庭账本');
          }
        }
      } catch (error) {
        console.error('验证账本权限时出错:', error);
        throw error;
      }
    }

    // 解析月份
    const [year, monthNum] = month.split('-').map(Number);
    if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new Error('无效的月份格式，应为 YYYY-MM');
    }

    // 计算月份的开始和结束日期
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    console.log('查询预算的日期范围:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // 在查询预算前，确保用户有当前月份的预算（如果指定了账本ID）
    if (accountBookId) {
      try {
        const { BudgetService } = require('./budget.service');
        const budgetService = new BudgetService();
        await budgetService.ensureCurrentMonthBudget(userId, accountBookId);
      } catch (error) {
        console.error('预算统计时确保当前月份预算失败:', error);
        // 不影响统计查询流程，继续执行
      }
    }

    // 获取月度预算 - 查询当前用户的个人预算（包括用户自己创建的预算）
    const budgets = await this.budgetRepository.findByPeriodAndDate(
      userId,
      BudgetPeriod.MONTHLY,
      startDate,
      endDate,
      familyId,
      accountBookId,
      false, // 设置excludeFamilyMember为false，查询用户的个人预算
    );

    console.log(`找到 ${budgets.length} 个当前用户的预算`);

    // 获取分类信息
    const categories = await this.getCategoriesMap(userId, familyId);

    // 计算总预算金额（包含结转金额）
    let totalBudget = 0;
    let totalRolloverAmount = 0;

    for (const budget of budgets) {
      const budgetAmount = Number(budget.amount);
      const rolloverAmount = Number(budget.rolloverAmount || 0);
      totalBudget += budgetAmount;
      totalRolloverAmount += rolloverAmount;
    }

    // 总可用预算 = 本月预算 + 上月结转
    const totalAvailableBudget = totalBudget + totalRolloverAmount;

    console.log('预算金额计算:', {
      totalBudget,
      totalRolloverAmount,
      totalAvailableBudget,
    });

    // 获取支出记账记录 - 查询当前用户的记账记录（包括用户自己的记账）
    const transactions = await this.transactionRepository.findByDateRange(
      userId,
      TransactionType.EXPENSE,
      startDate,
      endDate,
      familyId,
      accountBookId,
      false, // 设置excludeFamilyMember为false，查询用户的记账记录
    );

    console.log(`找到 ${transactions.length} 条当前用户的记账记录`);

    // 使用预算仓库的calculateSpentAmount方法来计算总支出
    const { BudgetRepository } = require('../repositories/budget.repository');
    const budgetRepository = new BudgetRepository();

    let totalSpent = 0;
    for (const budget of budgets) {
      const spent = await budgetRepository.calculateSpentAmount(budget.id);
      totalSpent += spent;
    }

    console.log('支出金额计算:', {
      totalSpent,
    });

    // 计算剩余金额和百分比（基于总可用预算）
    const remaining = totalAvailableBudget - totalSpent;
    const percentage = totalAvailableBudget > 0 ? (totalSpent / totalAvailableBudget) * 100 : 0;

    // 按分类计算预算执行情况
    const categoriesData = await this.calculateBudgetByCategory(budgets, transactions, categories);

    // 获取最近5条记账记录
    const recentTransactions = transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map((t) => {
        const category = categories.get(t.categoryId);
        return {
          id: t.id,
          title: t.description || '未命名记账', // 使用description字段作为title
          amount: Number(t.amount),
          date: new Date(t.date).toISOString(),
          categoryId: t.categoryId,
          categoryName: category?.name || '未知分类',
          categoryIcon: category?.icon,
          type: t.type,
        };
      });

    // 获取活跃预算
    const { BudgetService } = require('../services/budget.service');
    const budgetService = new BudgetService();
    const allActiveBudgets = await budgetService.getActiveBudgets(userId, accountBookId);

    // 根据预算类型过滤活跃预算
    const activeBudgets = budgetType
      ? allActiveBudgets.filter((budget: any) => budget.budgetType === budgetType)
      : allActiveBudgets;

    console.log(`过滤后的活跃预算数量: ${activeBudgets.length}, 预算类型: ${budgetType || '全部'}`);

    // 处理活跃预算，转换为预算卡片格式
    const budgetCards = activeBudgets.map((budget: any) => ({
      id: budget.id,
      name: budget.name,
      type: budget.budgetType,
      userId: budget.userId,
      userName: budget.userName,
      period: `${new Date(budget.startDate).getFullYear()}年${
        new Date(budget.startDate).getMonth() + 1
      }月`,
    }));

    // 获取家庭成员信息（只在个人预算类型且是家庭账本时处理）
    let familyMembers: any[] = [];
    if (accountBook && accountBook.type === 'FAMILY' && accountBook.familyId &&
        (!budgetType || budgetType === 'PERSONAL')) {
      const { FamilyRepository } = require('../repositories/family.repository');
      const familyRepository = new FamilyRepository();
      const members = await familyRepository.findFamilyMembers(accountBook.familyId);

      // 将家庭成员转换为前端需要的格式
      familyMembers = members.map((member: any) => {
        // 查找该成员的预算
        let memberBudget;

        if (member.isCustodial) {
          // 如果是托管成员，通过familyMemberId查找预算
          memberBudget = allActiveBudgets.find(
            (b: any) => b.familyMemberId === member.id && b.budgetType === 'PERSONAL',
          );
        } else {
          // 如果是普通成员，通过userId查找预算
          memberBudget = allActiveBudgets.find(
            (b: any) => b.userId === member.userId && b.budgetType === 'PERSONAL',
          );
        }

        return {
          id: member.id, // 使用成员ID而不是用户ID
          name: member.isCustodial ? member.name : member.user?.name || '未知用户',
          budgetId: memberBudget?.id || '',
          isCustodial: member.isCustodial || false,
        };
      });
    }

    // 构建第一个预算的概览数据（如果有）
    let overview = null;
    if (activeBudgets.length > 0) {
      const firstBudget = activeBudgets[0];
      overview = {
        id: firstBudget.id,
        name: firstBudget.name,
        period: `${new Date(firstBudget.startDate).toLocaleDateString()} - ${new Date(
          firstBudget.endDate,
        ).toLocaleDateString()}`,
        amount: Number(firstBudget.amount),
        spent: Number(firstBudget.spent || 0),
        remaining: Number(firstBudget.remaining || 0),
        percentage: Number(firstBudget.percentage || 0),
        rollover: Number(firstBudget.rolloverAmount || 0),
        daysRemaining: this.calculateDaysRemaining(firstBudget.endDate),
        dailySpent: this.calculateDailySpent(firstBudget.spent || 0, firstBudget.startDate),
        dailyAvailable: this.calculateDailyAvailable(
          firstBudget.remaining || 0,
          firstBudget.endDate,
        ),
      };
    }

    // 返回扩展的响应数据
    return {
      // 原始预算统计数据（修正为基于总可用预算的计算）
      totalBudget: totalAvailableBudget, // 使用总可用预算（包含结转金额）
      totalSpent,
      remaining,
      percentage,
      categories: categoriesData,
      recentTransactions,

      // 添加前端需要的额外数据
      budgetCards,
      familyMembers,
      overview,
      enableCategoryBudget:
        activeBudgets.length > 0 ? activeBudgets[0].enableCategoryBudget : false,

      // 添加详细的预算信息
      budgetBreakdown: {
        baseBudget: totalBudget, // 本月设定的预算金额
        rolloverAmount: totalRolloverAmount, // 上月结转金额
        totalAvailable: totalAvailableBudget, // 总可用预算
      },
    };
  }

  /**
   * 计算剩余天数
   */
  private calculateDaysRemaining(endDate?: Date): number {
    if (!endDate) return 0;

    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  /**
   * 计算日均消费
   */
  private calculateDailySpent(spent: number, startDate?: Date): number {
    if (!startDate) return 0;

    const start = new Date(startDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const daysPassed = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    return spent / daysPassed;
  }

  /**
   * 计算日均可用
   */
  private calculateDailyAvailable(remaining: number, endDate?: Date): number {
    const daysRemaining = this.calculateDaysRemaining(endDate);
    return daysRemaining > 0 ? remaining / daysRemaining : 0;
  }

  /**
   * 获取财务概览
   */
  async getFinancialOverview(
    userId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' | 'category' = 'day',
    familyId?: string,
    accountBookId?: string,
    budgetId?: string,
    type?: string,
    categoryIds?: string[],
    tagIds?: string[],
    budgetIds?: string[],
  ): Promise<FinancialOverviewResponseDto> {
    // 验证用户是否为家庭成员
    if (familyId) {
      const isMember = await this.isUserFamilyMember(userId, familyId);
      if (!isMember) {
        throw new Error('无权访问此家庭数据');
      }
    }

    // 处理预算ID参数
    let actualBudgetId = budgetId;
    let actualBudgetIds = budgetIds;

    // 如果有budgetIds参数，优先使用budgetIds
    if (budgetIds && budgetIds.length > 0) {
      console.log('使用多个预算ID进行查询:', budgetIds);
      actualBudgetId = undefined; // 使用budgetIds时，不使用单个budgetId
    } else if (budgetId === 'NO_BUDGET') {
      console.log('检测到无预算筛选，查询budgetId为null的记账');
      // 无预算筛选，保持budgetId为'NO_BUDGET'传递给记账查询
      actualBudgetId = 'NO_BUDGET';
      actualBudgetIds = undefined;
    } else if (budgetId && budgetId.startsWith('aggregated_')) {
      console.log('检测到聚合预算ID，将忽略budgetId参数进行聚合查询');
      // 对于聚合预算，不传递budgetId给记账查询，让它查询所有相关记账
      actualBudgetId = undefined;
      actualBudgetIds = undefined;
    }

    // 获取收入记账记录 - 不排除家庭成员的记账记录，统计该账本的所有记账
    const incomeTransactions = await this.transactionRepository.findByDateRange(
      userId,
      TransactionType.INCOME,
      startDate,
      endDate,
      familyId,
      accountBookId,
      false, // 设置excludeFamilyMember为false，统计该账本的所有记账记录
      actualBudgetId,
      categoryIds,
      tagIds,
      actualBudgetIds,
    );

    // 获取支出记账记录 - 不排除家庭成员的记账记录，统计该账本的所有记账
    const expenseTransactions = await this.transactionRepository.findByDateRange(
      userId,
      TransactionType.EXPENSE,
      startDate,
      endDate,
      familyId,
      accountBookId,
      false, // 设置excludeFamilyMember为false，统计该账本的所有记账记录
      actualBudgetId,
      categoryIds,
      tagIds,
      actualBudgetIds,
    );

    // 获取分类信息
    const categories = await this.getCategoriesMap(userId, familyId);

    // 计算总收入和总支出
    const income = incomeTransactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const expense = expenseTransactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const netIncome = income - expense;

    // 按分类分组收入和支出
    const incomeByCategoryMap = new Map<string, number>();
    for (const t of incomeTransactions) {
      const current = incomeByCategoryMap.get(t.categoryId) || 0;
      incomeByCategoryMap.set(t.categoryId, current + Number(t.amount));
    }

    const expenseByCategoryMap = new Map<string, number>();
    for (const t of expenseTransactions) {
      const current = expenseByCategoryMap.get(t.categoryId) || 0;
      expenseByCategoryMap.set(t.categoryId, current + Number(t.amount));
    }

    // 获取收入分类排名
    const topIncomeCategories = Array.from(incomeByCategoryMap.entries())
      .map(([categoryId, amount]) => ({
        categoryId,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(({ categoryId, amount }) => {
        const category = categories.get(categoryId);
        console.log(`收入分类 ${categoryId} 的信息:`, category);
        return {
          category: {
            id: categoryId,
            name: category?.name || '未知分类',
            icon: category?.icon,
          },
          amount,
          percentage: income > 0 ? (amount / income) * 100 : 0,
        };
      });

    // 获取支出分类排名
    const topExpenseCategories = Array.from(expenseByCategoryMap.entries())
      .map(([categoryId, amount]) => ({
        categoryId,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(({ categoryId, amount }) => {
        const category = categories.get(categoryId);
        console.log(`支出分类 ${categoryId} 的信息:`, category);
        return {
          category: {
            id: categoryId,
            name: category?.name || '未知分类',
            icon: category?.icon,
          },
          amount,
          percentage: expense > 0 ? (amount / expense) * 100 : 0,
        };
      });

    // 按时间分组收入和支出
    const incomeByPeriod = this.groupTransactionsByDate(incomeTransactions, groupBy);
    const expenseByPeriod = this.groupTransactionsByDate(expenseTransactions, groupBy);

    // 合并收入和支出数据，生成统计数据
    const periodMap = new Map<string, { income: number; expense: number }>();

    // 添加收入数据
    for (const item of incomeByPeriod) {
      periodMap.set(item.date, { income: item.amount, expense: 0 });
    }

    // 添加支出数据
    for (const item of expenseByPeriod) {
      const existing = periodMap.get(item.date) || { income: 0, expense: 0 };
      periodMap.set(item.date, { ...existing, expense: item.amount });
    }

    // 生成时间范围内的所有时间段
    const allPeriods = this.generatePeriodRange(startDate, endDate, groupBy);

    // 确保所有时间段都有数据
    for (const period of allPeriods) {
      if (!periodMap.has(period)) {
        periodMap.set(period, { income: 0, expense: 0 });
      }
    }

    // 生成统计数据
    const dailyStatistics = Array.from(periodMap.entries())
      .map(([date, data]) => ({
        date,
        income: data.income,
        expense: data.expense,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      income,
      expense,
      netIncome,
      topIncomeCategories,
      topExpenseCategories,
      dailyStatistics,
    };
  }

  /**
   * 生成时间段范围
   */
  private generatePeriodRange(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' | 'category',
  ): string[] {
    const periods: string[] = [];
    const current = new Date(startDate);

    switch (groupBy) {
      case 'day':
        while (current <= endDate) {
          periods.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
        break;
      case 'week':
        // 找到开始日期所在周的周一
        const startDay = current.getDay();
        const startDiff = current.getDate() - startDay + (startDay === 0 ? -6 : 1);
        current.setDate(startDiff);

        while (current <= endDate) {
          periods.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 7);
        }
        break;
      case 'month':
        current.setDate(1); // 设置为月初
        while (current <= endDate) {
          const year = current.getFullYear();
          const month = String(current.getMonth() + 1).padStart(2, '0');
          periods.push(`${year}-${month}`);
          current.setMonth(current.getMonth() + 1);
        }
        break;
    }

    return periods;
  }

  /**
   * 按日期分组记账
   */
  private groupTransactionsByDate(
    transactions: any[],
    groupBy: 'day' | 'week' | 'month' | 'category',
  ): Array<{ date: string; amount: number }> {
    const groupedData = new Map<string, number>();

    for (const transaction of transactions) {
      const date = new Date(transaction.date);
      let key: string;

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'week':
          // 获取周的第一天 (周一)
          const day = date.getDay();
          const diff = date.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(date);
          monday.setDate(diff);
          key = monday.toISOString().split('T')[0]; // 周一的日期
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
          break;
        default:
          key = date.toISOString().split('T')[0]; // 默认按天
      }

      const currentAmount = groupedData.get(key) || 0;
      groupedData.set(key, currentAmount + Number(transaction.amount));
    }

    // 转换为数组并排序
    return Array.from(groupedData.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 按分类分组记账
   */
  private groupTransactionsByCategory(
    transactions: any[],
    categories: Map<string, any>,
    total: number,
  ): Array<{
    category: { id: string; name: string; icon?: string };
    amount: number;
    percentage: number;
  }> {
    const groupedData = new Map<string, number>();

    for (const transaction of transactions) {
      const categoryId = transaction.categoryId;
      const currentAmount = groupedData.get(categoryId) || 0;
      groupedData.set(categoryId, currentAmount + Number(transaction.amount));
    }

    // 转换为数组并排序
    return Array.from(groupedData.entries())
      .map(([categoryId, amount]) => {
        const category = categories.get(categoryId);
        return {
          category: {
            id: categoryId,
            name: category?.name || '未知分类',
            icon: category?.icon,
          },
          amount,
          percentage: total > 0 ? (amount / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * 检查是否存在无预算记账
   */
  async hasUnbudgetedTransactions(
    userId: string,
    startDate: Date,
    endDate: Date,
    familyId?: string,
    accountBookId?: string,
  ): Promise<boolean> {
    // 验证用户是否为家庭成员
    if (familyId) {
      const isMember = await this.isUserFamilyMember(userId, familyId);
      if (!isMember) {
        throw new Error('无权访问此家庭数据');
      }
    }

    const whereConditions: any = {
      budgetId: null, // 查找无预算的记账
      date: {
        gte: startDate,
        lte: endDate,
      },
      ...(familyId && { familyId }),
    };

    // 如果指定了账本ID，则查询该账本的记账记录
    if (accountBookId) {
      whereConditions.accountBookId = accountBookId;

      // 验证用户是否有权限查看该账本
      const accountBook = await prisma.accountBook.findFirst({
        where: {
          id: accountBookId,
          OR: [
            { userId: userId }, // 个人账本
            {
              family: {
                members: {
                  some: { userId: userId }, // 家庭账本成员
                },
              },
            },
          ],
        },
      });

      if (!accountBook) {
        throw new Error('无权限查看该账本的记账记录');
      }
    } else {
      // 如果没有指定账本ID，则只查询用户自己的记账记录
      whereConditions.userId = userId;
    }

    const count = await prisma.transaction.count({
      where: whereConditions,
    });

    return count > 0;
  }

  /**
   * 计算各分类的预算执行情况
   */
  private async calculateBudgetByCategory(
    budgets: any[],
    transactions: any[],
    categories: Map<string, any>,
  ): Promise<
    Array<{
      category: { id: string; name: string; icon?: string };
      budget: number;
      spent: number;
      remaining: number;
      percentage: number;
    }>
  > {
    // 按分类ID分组预算
    const budgetByCategory = new Map<string, number>();
    const budgetIdByCategory = new Map<string, string>(); // 存储分类对应的预算ID

    for (const budget of budgets) {
      if (budget.categoryId) {
        budgetByCategory.set(budget.categoryId, Number(budget.amount));
        budgetIdByCategory.set(budget.categoryId, budget.id);
      }
    }

    // 使用预算仓库的calculateSpentAmount方法来获取准确的已使用金额
    const { BudgetRepository } = require('../repositories/budget.repository');
    const budgetRepository = new BudgetRepository();

    // 合并预算和支出数据
    const result: Array<{
      category: { id: string; name: string; icon?: string };
      budget: number;
      spent: number;
      remaining: number;
      percentage: number;
    }> = [];

    // 处理有预算的分类
    for (const [categoryId, budget] of budgetByCategory.entries()) {
      const budgetId = budgetIdByCategory.get(categoryId);
      let spent = 0;

      if (budgetId) {
        // 使用预算ID来计算准确的已使用金额
        spent = await budgetRepository.calculateSpentAmount(budgetId);
      }

      const category = categories.get(categoryId);

      result.push({
        category: {
          id: categoryId,
          name: category?.name || '未知分类',
          icon: category?.icon,
        },
        budget,
        spent,
        remaining: budget - spent,
        percentage: budget > 0 ? (spent / budget) * 100 : 0,
      });
    }

    // 按支出百分比排序
    return result.sort((a, b) => b.percentage - a.percentage);
  }

  /**
   * 获取分类映射
   */
  private async getCategoriesMap(userId: string, familyId?: string): Promise<Map<string, any>> {
    // 获取默认分类
    const defaultCategories = await this.categoryRepository.findDefaultCategories();

    // 获取用户或家庭分类
    let userCategories;
    if (familyId) {
      userCategories = await this.categoryRepository.findByFamilyId(familyId);
    } else {
      userCategories = await this.categoryRepository.findByUserId(userId);
    }

    // 合并所有分类
    const allCategories = [...defaultCategories, ...userCategories];

    console.log(
      `获取到 ${defaultCategories.length} 个默认分类和 ${userCategories.length} 个用户/家庭分类`,
    );

    const categoriesMap = new Map<string, any>();
    for (const category of allCategories) {
      categoriesMap.set(category.id, category);
    }

    console.log(`分类映射包含 ${categoriesMap.size} 个分类`);

    return categoriesMap;
  }

  /**
   * 验证用户是否为家庭成员
   */
  private async isUserFamilyMember(userId: string, familyId: string): Promise<boolean> {
    // 检查用户是否为家庭创建者
    const family = await this.familyRepository.findFamilyById(familyId);
    if (family && family.createdBy === userId) {
      return true;
    }

    // 检查用户是否为家庭成员
    const member = await this.familyRepository.findFamilyMemberByUserAndFamily(userId, familyId);
    return !!member;
  }

  /**
   * 获取标签统计
   */
  async getTagStatistics(
    userId: string,
    accountBookId: string,
    startDate: Date,
    endDate: Date,
    tagIds?: string[],
    transactionType?: 'income' | 'expense',
    categoryIds?: string[],
  ): Promise<any> {
    // 验证用户是否有权访问账本
    const { AccountBookRepository } = require('../repositories/account-book.repository');
    const accountBookRepository = new AccountBookRepository();

    const accountBook = await accountBookRepository.findById(accountBookId);
    if (!accountBook) {
      throw new Error('账本不存在');
    }

    // 验证权限
    if (accountBook.type === 'PERSONAL') {
      if (accountBook.userId !== userId) {
        throw new Error('无权访问此账本');
      }
    } else if (accountBook.type === 'FAMILY') {
      if (!accountBook.familyId) {
        throw new Error('账本数据错误：家庭账本缺少家庭ID');
      }
      const isMember = await this.isUserFamilyMember(userId, accountBook.familyId);
      if (!isMember) {
        throw new Error('无权访问此家庭账本');
      }
    }

    // 获取标签统计数据
    const { TagService } = require('./tag.service');
    const tagService = new TagService();

    const statistics = await tagService.getTagStatistics({
      accountBookId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      tagIds,
      transactionType,
      categoryIds,
    });

    return statistics;
  }
}
