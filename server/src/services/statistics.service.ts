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
  ): Promise<BudgetStatisticsResponseDto> {
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
    if (accountBookId) {
      try {
        // 导入AccountBookRepository
        const { AccountBookRepository } = require('../repositories/account-book.repository');
        const accountBookRepository = new AccountBookRepository();

        // 查找账本
        const accountBook = await accountBookRepository.findById(accountBookId);
        console.log('查找账本结果:', accountBook);

        if (!accountBook) {
          throw new Error('账本不存在');
        }

        // 验证权限
        if (accountBook.userId !== userId) {
          console.error('账本权限验证失败:', {
            accountBookUserId: accountBook.userId,
            requestUserId: userId
          });
          throw new Error('无权访问此账本');
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

    return {
      totalBudget,
      totalSpent,
      remaining,
      percentage,
      categories: categoriesData,
    };
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
