import { apiClient } from "./api";
import {
  StatisticsResponse,
  BudgetStatistics,
  Transaction,
  TransactionGroup
} from "@/types";
import { formatDate } from "./utils";

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

  console.log("请求财务概览数据URL:", url);

  try {
    const response = await apiClient.get<StatisticsResponse>(url);
    console.log("财务概览数据响应:", response);
    return response;
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

  console.log("请求预算数据URL:", url);

  try {
    const response = await apiClient.get<BudgetStatistics>(url);
    console.log("预算数据响应:", response);
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

  console.log("请求交易数据URL:", url);

  try {
    // 处理分页响应结构
    const response = await apiClient.get<{total: number, page: number, limit: number, data: Transaction[]}>(url);
    console.log("交易数据响应:", response);

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
