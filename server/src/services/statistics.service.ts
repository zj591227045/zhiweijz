// 定义枚举
enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

enum BudgetPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}
import { TransactionRepository } from '../repositories/transaction.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { BudgetRepository } from '../repositories/budget.repository';
import { FamilyRepository } from '../repositories/family.repository';
import { toCategoryResponseDto } from '../models/category.model';

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
  // 添加最近交易记录
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
    accountBookId?: string
  ): Promise<ExpenseStatisticsResponseDto> {
    // 验证用户是否为家庭成员
    if (familyId) {
      const isMember = await this.isUserFamilyMember(userId, familyId);
      if (!isMember) {
        throw new Error('无权访问此家庭数据');
      }
    }

    // 获取交易记录
    const transactions = await this.transactionRepository.findByDateRange(
      userId,
      TransactionType.EXPENSE,
      startDate,
      endDate,
      familyId,
      accountBookId
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
    accountBookId?: string
  ): Promise<IncomeStatisticsResponseDto> {
    // 验证用户是否为家庭成员
    if (familyId) {
      const isMember = await this.isUserFamilyMember(userId, familyId);
      if (!isMember) {
        throw new Error('无权访问此家庭数据');
      }
    }

    // 获取交易记录
    const transactions = await this.transactionRepository.findByDateRange(
      userId,
      TransactionType.INCOME,
      startDate,
      endDate,
      familyId,
      accountBookId
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
    accountBookId?: string
  ): Promise<any> { // 修改返回类型为any，以便返回扩展的数据
    console.log('StatisticsService.getBudgetStatistics 参数:', {
      userId,
      month,
      familyId,
      accountBookId
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
              requestUserId: userId
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
              requestUserId: userId
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
      endDate: endDate.toISOString()
    });

    // 获取月度预算
    const budgets = await this.budgetRepository.findByPeriodAndDate(
      userId,
      BudgetPeriod.MONTHLY,
      startDate,
      endDate,
      familyId,
      accountBookId
    );

    console.log(`找到 ${budgets.length} 个预算`);

    // 获取分类信息
    const categories = await this.getCategoriesMap(userId, familyId);

    // 计算总预算
    const totalBudget = budgets.reduce((sum: number, b: any) => sum + Number(b.amount), 0);

    // 获取支出交易记录
    const transactions = await this.transactionRepository.findByDateRange(
      userId,
      TransactionType.EXPENSE,
      startDate,
      endDate,
      familyId,
      accountBookId
    );

    console.log(`找到 ${transactions.length} 条交易记录`);

    // 计算总支出
    const totalSpent = transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    // 计算剩余金额和百分比
    const remaining = totalBudget - totalSpent;
    const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    // 按分类计算预算执行情况
    const categoriesData = this.calculateBudgetByCategory(budgets, transactions, categories);

    // 获取最近5条交易记录
    const recentTransactions = transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(t => {
        const category = categories.get(t.categoryId);
        return {
          id: t.id,
          title: t.description || '未命名交易', // 使用description字段作为title
          amount: Number(t.amount),
          date: new Date(t.date).toISOString(),
          categoryId: t.categoryId,
          categoryName: category?.name || '未知分类',
          categoryIcon: category?.icon,
          type: t.type
        };
      });

    // 获取活跃预算
    const { BudgetService } = require('../services/budget.service');
    const budgetService = new BudgetService();
    const activeBudgets = await budgetService.getActiveBudgets(userId, accountBookId);

    // 处理活跃预算，转换为预算卡片格式
    const budgetCards = activeBudgets.map((budget: any) => ({
      id: budget.id,
      name: budget.name,
      type: budget.budgetType,
      userId: budget.userId,
      userName: budget.userName,
      period: `${new Date(budget.startDate).getFullYear()}年${new Date(budget.startDate).getMonth() + 1}月`
    }));

    // 获取家庭成员信息（如果是家庭账本）
    let familyMembers: any[] = [];
    if (accountBook && accountBook.type === 'FAMILY' && accountBook.familyId) {
      const { FamilyRepository } = require('../repositories/family.repository');
      const familyRepository = new FamilyRepository();
      const members = await familyRepository.findFamilyMembers(accountBook.familyId);

      // 将家庭成员转换为前端需要的格式
      familyMembers = members.map((member: any) => {
        // 查找该成员的预算
        const memberBudget = activeBudgets.find((b: any) =>
          b.userId === member.userId && b.budgetType === 'PERSONAL');

        return {
          id: member.userId,
          name: member.user?.name || '未知用户',
          budgetId: memberBudget?.id || ''
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
        period: `${new Date(firstBudget.startDate).toLocaleDateString()} - ${new Date(firstBudget.endDate).toLocaleDateString()}`,
        amount: Number(firstBudget.amount),
        spent: Number(firstBudget.spent || 0),
        remaining: Number(firstBudget.remaining || 0),
        percentage: Number(firstBudget.percentage || 0),
        rollover: Number(firstBudget.rolloverAmount || 0),
        daysRemaining: this.calculateDaysRemaining(firstBudget.endDate),
        dailySpent: this.calculateDailySpent(firstBudget.spent || 0, firstBudget.startDate),
        dailyAvailable: this.calculateDailyAvailable(firstBudget.remaining || 0, firstBudget.endDate)
      };
    }

    // 返回扩展的响应数据
    return {
      // 原始预算统计数据
      totalBudget,
      totalSpent,
      remaining,
      percentage,
      categories: categoriesData,
      recentTransactions,

      // 添加前端需要的额外数据
      budgetCards,
      familyMembers,
      overview,
      enableCategoryBudget: activeBudgets.length > 0 ? activeBudgets[0].enableCategoryBudget : false
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
    familyId?: string,
    accountBookId?: string
  ): Promise<FinancialOverviewResponseDto> {
    // 验证用户是否为家庭成员
    if (familyId) {
      const isMember = await this.isUserFamilyMember(userId, familyId);
      if (!isMember) {
        throw new Error('无权访问此家庭数据');
      }
    }

    // 获取收入交易记录
    const incomeTransactions = await this.transactionRepository.findByDateRange(
      userId,
      TransactionType.INCOME,
      startDate,
      endDate,
      familyId,
      accountBookId
    );

    // 获取支出交易记录
    const expenseTransactions = await this.transactionRepository.findByDateRange(
      userId,
      TransactionType.EXPENSE,
      startDate,
      endDate,
      familyId,
      accountBookId
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

    // 按日期分组收入和支出
    const dailyIncomeMap = new Map<string, number>();
    for (const t of incomeTransactions) {
      const date = new Date(t.date).toISOString().split('T')[0]; // YYYY-MM-DD
      const current = dailyIncomeMap.get(date) || 0;
      dailyIncomeMap.set(date, current + Number(t.amount));
    }

    const dailyExpenseMap = new Map<string, number>();
    for (const t of expenseTransactions) {
      const date = new Date(t.date).toISOString().split('T')[0]; // YYYY-MM-DD
      const current = dailyExpenseMap.get(date) || 0;
      dailyExpenseMap.set(date, current + Number(t.amount));
    }

    // 生成日期范围内的所有日期
    const allDates = new Set<string>();
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      allDates.add(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 添加已有交易的日期
    dailyIncomeMap.forEach((_, date) => allDates.add(date));
    dailyExpenseMap.forEach((_, date) => allDates.add(date));

    // 生成每日统计数据
    const dailyStatistics = Array.from(allDates)
      .map(date => ({
        date,
        income: dailyIncomeMap.get(date) || 0,
        expense: dailyExpenseMap.get(date) || 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      income,
      expense,
      netIncome,
      topIncomeCategories,
      topExpenseCategories,
      dailyStatistics
    };
  }

  /**
   * 按日期分组交易
   */
  private groupTransactionsByDate(
    transactions: any[],
    groupBy: 'day' | 'week' | 'month' | 'category'
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
   * 按分类分组交易
   */
  private groupTransactionsByCategory(
    transactions: any[],
    categories: Map<string, any>,
    total: number
  ): Array<{ category: { id: string; name: string; icon?: string }; amount: number; percentage: number }> {
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
   * 计算各分类的预算执行情况
   */
  private calculateBudgetByCategory(
    budgets: any[],
    transactions: any[],
    categories: Map<string, any>
  ): Array<{
    category: { id: string; name: string; icon?: string };
    budget: number;
    spent: number;
    remaining: number;
    percentage: number;
  }> {
    // 按分类ID分组预算
    const budgetByCategory = new Map<string, number>();
    for (const budget of budgets) {
      if (budget.categoryId) {
        budgetByCategory.set(budget.categoryId, Number(budget.amount));
      }
    }

    // 按分类ID分组支出
    const spentByCategory = new Map<string, number>();
    for (const transaction of transactions) {
      const current = spentByCategory.get(transaction.categoryId) || 0;
      spentByCategory.set(transaction.categoryId, current + Number(transaction.amount));
    }

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
      const spent = spentByCategory.get(categoryId) || 0;
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

    // 处理无预算但有支出的分类
    for (const [categoryId, spent] of spentByCategory.entries()) {
      if (!budgetByCategory.has(categoryId)) {
        const category = categories.get(categoryId);

        result.push({
          category: {
            id: categoryId,
            name: category?.name || '未知分类',
            icon: category?.icon,
          },
          budget: 0,
          spent,
          remaining: -spent,
          percentage: 100, // 无预算但有支出，视为100%
        });
      }
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

    console.log(`获取到 ${defaultCategories.length} 个默认分类和 ${userCategories.length} 个用户/家庭分类`);

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
}
