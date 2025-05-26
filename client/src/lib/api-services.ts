import { apiClient } from "./api";
import {
  StatisticsResponse,
  BudgetStatistics,
  Transaction,
  TransactionGroup
} from "@/types";
import { formatDate } from "./utils";
import { logApiTime } from "./performance";



/**
 * 获取财务概览数据
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @param accountBookId 账本ID
 * @returns 财务概览数据
 */
export async function getFinancialOverview(
  startDate: string,
  endDate: string,
  accountBookId?: string
): Promise<StatisticsResponse> {
  let url = `/statistics/overview?startDate=${startDate}&endDate=${endDate}`;

  if (accountBookId) {
    url += `&accountBookId=${accountBookId}`;
  }

  // 仅在开发环境输出日志
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) console.log("请求财务概览数据URL:", url);

  try {
    // 记录API请求时间
    const endApiTime = logApiTime(`getFinancialOverview`);

    // 获取API响应，强制使用缓存并设置较长的缓存时间
    const apiResponse = await apiClient.get<any>(url, {
      useCache: true,
      cacheTTL: 5 * 60 * 1000, // 5分钟缓存，减少重复请求
    });

    // 结束API请求时间记录
    endApiTime();
    if (isDev) console.log("财务概览数据原始响应:", apiResponse);

    // 将API响应转换为前端组件期望的数据结构
    const transformedResponse: StatisticsResponse = {
      totalIncome: apiResponse.income || 0,
      totalExpense: apiResponse.expense || 0,
      balance: apiResponse.netIncome || 0,
      incomeByCategory: Array.isArray(apiResponse.topIncomeCategories)
        ? apiResponse.topIncomeCategories.map((cat: any) => ({
            categoryId: cat.category?.id || '',
            categoryName: cat.category?.name || '',
            amount: cat.amount || 0,
            percentage: cat.percentage || 0
          }))
        : [],
      expenseByCategory: Array.isArray(apiResponse.topExpenseCategories)
        ? apiResponse.topExpenseCategories.map((cat: any) => ({
            categoryId: cat.category?.id || '',
            categoryName: cat.category?.name || '',
            amount: cat.amount || 0,
            percentage: cat.percentage || 0
          }))
        : [],
      // 使用API返回的每日统计数据
      dailyStatistics: apiResponse.dailyStatistics || []
    };

    return transformedResponse;
  } catch (error) {
    console.error("获取财务概览数据错误:", error);
    // 返回默认数据，避免页面崩溃
    return {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      incomeByCategory: [],
      expenseByCategory: [],
      dailyStatistics: []
    };
  }
}

/**
 * 获取预算执行情况
 * @param month 月份 (YYYY-MM)
 * @param accountBookId 账本ID
 * @returns 预算执行情况
 */
export async function getBudgetStatistics(
  month: string,
  accountBookId?: string
): Promise<BudgetStatistics> {
  let url = `/statistics/budgets?month=${month}`;

  if (accountBookId) {
    url += `&accountBookId=${accountBookId}`;
  }

  // 仅在开发环境输出日志
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) console.log("请求预算数据URL:", url);

  try {
    // 记录API请求时间
    const endApiTime = logApiTime(`getBudgetStatistics`);

    const response = await apiClient.get<BudgetStatistics>(url, {
      useCache: true,
      cacheTTL: 5 * 60 * 1000, // 5分钟缓存，减少重复请求
    });

    // 结束API请求时间记录
    endApiTime();
    if (isDev) console.log("预算数据响应:", response);

    // 确保每个预算类别都有周期信息
    if (response && response.categories) {
      response.categories = response.categories.map(cat => {
        // 如果后端没有提供period字段，尝试从名称推断
        if (!cat.period) {
          // 默认设置为月度预算
          cat.period = 'MONTHLY';

          // 根据名称进一步细化
          if (cat.category.name.includes('月') ||
              cat.category.name.includes('monthly') ||
              cat.category.name.includes('月度')) {
            cat.period = 'MONTHLY';
          } else if (cat.category.name.includes('年') ||
                    cat.category.name.includes('yearly') ||
                    cat.category.name.includes('年度')) {
            cat.period = 'YEARLY';
          } else if (cat.category.name.includes('家庭') ||
                    cat.category.name.includes('family')) {
            cat.period = 'FAMILY';
          }
        }

        // 如果是"未知分类"或"other"，降低其优先级
        if (cat.category.name.includes('未知') ||
            cat.category.name.includes('other') ||
            cat.category.name === '未知分类') {
          cat.period = 'OTHER';
        }

        return cat;
      });
    }

    return response;
  } catch (error) {
    console.error("获取预算数据错误:", error);
    // 返回默认数据，避免页面崩溃
    return {
      totalBudget: 0,
      totalSpent: 0,
      remaining: 0,
      percentage: 0,
      categories: []
    };
  }
}

/**
 * 获取最近交易记录
 * @param limit 限制数量
 * @param accountBookId 账本ID
 * @returns 交易记录列表
 */
export async function getRecentTransactions(
  limit: number = 10,
  accountBookId?: string
): Promise<Transaction[]> {
  let url = `/transactions?limit=${limit}&sort=date:desc`;

  if (accountBookId) {
    url += `&accountBookId=${accountBookId}`;
  }

  // 仅在开发环境输出日志
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) console.log("请求交易数据URL:", url);

  try {
    // 记录API请求时间
    const endApiTime = logApiTime(`getRecentTransactions`);

    // 处理分页响应结构，强制使用缓存
    const response = await apiClient.get<{total: number, page: number, limit: number, data: Transaction[]}>(url, {
      useCache: true,
      cacheTTL: 5 * 60 * 1000, // 5分钟缓存，减少重复请求
    });

    // 结束API请求时间记录
    endApiTime();
    if (isDev) console.log("交易数据响应:", response);

    // 返回data数组部分
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    } else {
      console.error("交易数据响应格式不正确:", response);
      return [];
    }
  } catch (error) {
    console.error("获取交易数据错误:", error);
    // 返回默认数据，避免页面崩溃
    return [];
  }
}

/**
 * 将交易记录按日期分组
 * @param transactions 交易记录列表
 * @returns 按日期分组的交易记录
 */
export function groupTransactionsByDate(transactions: Transaction[]): TransactionGroup[] {
  // 检查transactions是否为数组
  if (!Array.isArray(transactions)) {
    console.error('groupTransactionsByDate: transactions不是数组', transactions);
    return [];
  }

  const groups: Record<string, Transaction[]> = {};

  // 按日期分组
  transactions.forEach(transaction => {
    if (!transaction || !transaction.date) {
      console.warn('发现无效的交易记录', transaction);
      return;
    }

    const date = formatDate(transaction.date);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
  });

  // 转换为数组并按日期排序
  return Object.entries(groups)
    .map(([date, transactions]) => ({ date, transactions }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * 获取当前月份的字符串表示
 * @returns 当前月份 (例如: 2023年5月)
 */
export function getCurrentMonthString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return `${year}年${month}月`;
}

/**
 * 获取当前月份的开始和结束日期
 * @returns 当前月份的开始和结束日期
 */
export function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
}

/**
 * 获取上个月的开始和结束日期
 * @param currentDate 当前日期，默认为当前时间
 * @returns 上个月的开始和结束日期
 */
export function getPreviousMonthRange(currentDate: Date = new Date()): { startDate: string; endDate: string } {
  const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
}

/**
 * 获取下个月的开始和结束日期
 * @param currentDate 当前日期，默认为当前时间
 * @returns 下个月的开始和结束日期
 */
export function getNextMonthRange(currentDate: Date = new Date()): { startDate: string; endDate: string } {
  const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
}

// 导出服务对象，用于dashboard-store
export const statisticsService = {
  getStatistics: getFinancialOverview
};

export const budgetService = {
  getBudgetStatistics
};

export const transactionService = {
  getRecentTransactions
};
