'use client';

import { create } from 'zustand';
import { statisticsService, budgetService, transactionService } from '@/lib/api-services';
import { formatDate } from '@/lib/utils';
import dayjs from 'dayjs';

// 仪表盘状态类型
interface DashboardState {
  // 数据状态
  monthlyStats: {
    income: number;
    expense: number;
    balance: number;
    month: string;
  };
  budgetCategories: any[];
  totalBudget: any;
  groupedTransactions: any[];
  isLoading: boolean;
  error: string | null;
  
  // 操作方法
  fetchDashboardData: (accountBookId: string) => Promise<void>;
  refreshDashboardData: (accountBookId: string) => Promise<void>;
  clearDashboardData: () => void;
}

// 获取月度统计的辅助函数
const fetchMonthlyStatistics = async (accountBookId: string) => {
  console.log("开始获取月度统计数据...");
  const startDate = dayjs().startOf("month").format("YYYY-MM-DD");
  const endDate = dayjs().endOf("month").format("YYYY-MM-DD");

  const response = await statisticsService.getStatistics(accountBookId, {
    startDate,
    endDate
  });

  console.log("月度统计数据响应:", response);

  return {
    income: response?.income || 0,
    expense: response?.expense || 0,
    balance: response?.netIncome || 0,
    month: formatDate(new Date(), "YYYY年MM月"),
  };
};

// 获取预算统计的辅助函数
const fetchBudgetStatistics = async (accountBookId: string) => {
  console.log("开始获取预算统计数据...");
  const currentMonth = dayjs().format("YYYY-MM");

  const response = await budgetService.getBudgetStatistics(accountBookId, {
    month: currentMonth
  });

  console.log("预算统计数据响应:", response);

  const categories = response?.categories?.map((cat: any) => ({
    id: cat.category.id,
    name: cat.category.name,
    icon: cat.category.icon,
    budget: cat.budget,
    spent: cat.spent,
    percentage: cat.percentage,
    period: cat.period || "MONTHLY",
    categoryId: cat.category.id,
  })) || [];

  const totalBudget = (response?.totalBudget && response?.totalSpent) ? {
    amount: response.totalBudget,
    spent: response.totalSpent,
    percentage: (response.totalSpent / response.totalBudget) * 100,
  } : null;

  return { categories, totalBudget };
};

// 获取最近交易的辅助函数
const fetchRecentTransactions = async (accountBookId: string) => {
  console.log("开始获取最近交易数据...");

  const transactionsResponse = await transactionService.getRecentTransactions(accountBookId, 10);
  console.log("最近交易数据响应:", transactionsResponse);

  if (transactionsResponse?.data && Array.isArray(transactionsResponse.data)) {
    const groupedByDate: Record<string, any[]> = {};

    transactionsResponse.data.forEach((tx: any) => {
      const dateKey = dayjs(tx.date).format("YYYY-MM-DD");
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(tx);
    });

    const formattedTransactions = Object.keys(groupedByDate)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(dateKey => {
        return {
          date: formatDate(dateKey, "MM月DD日"),
          transactions: groupedByDate[dateKey].map((tx: any) => ({
            id: tx.id,
            amount: tx.amount,
            type: tx.type,
            categoryName: tx.category?.name || "未分类",
            categoryIcon: tx.category?.icon || "other",
            description: tx.description || "",
            date: tx.date,
          })),
        };
      });

    console.log("格式化后的交易数据:", formattedTransactions);
    return formattedTransactions;
  }

  return [];
};

// 创建仪表盘状态管理
export const useDashboardStore = create<DashboardState>((set, get) => ({
  // 初始状态
  monthlyStats: {
    income: 0,
    expense: 0,
    balance: 0,
    month: formatDate(new Date(), "YYYY年MM月"),
  },
  budgetCategories: [],
  totalBudget: null,
  groupedTransactions: [],
  isLoading: false,
  error: null,
  
  // 获取仪表盘数据
  fetchDashboardData: async (accountBookId: string) => {
    try {
      set({ isLoading: true, error: null });

      // 并行请求数据
      const [monthlyStats, budgetData, transactions] = await Promise.all([
        fetchMonthlyStatistics(accountBookId),
        fetchBudgetStatistics(accountBookId),
        fetchRecentTransactions(accountBookId)
      ]);

      set({ 
        monthlyStats,
        budgetCategories: budgetData.categories,
        totalBudget: budgetData.totalBudget,
        groupedTransactions: transactions,
        isLoading: false 
      });
    } catch (error) {
      console.error("获取仪表盘数据失败:", error);
      set({ 
        isLoading: false,
        error: "获取仪表盘数据失败"
      });
    }
  },

  // 刷新仪表盘数据（不显示加载状态）
  refreshDashboardData: async (accountBookId: string) => {
    try {
      set({ error: null });
      console.log(`开始刷新仪表盘数据，账本ID: ${accountBookId}`);

      // 并行请求数据
      const [monthlyStats, budgetData, transactions] = await Promise.all([
        fetchMonthlyStatistics(accountBookId),
        fetchBudgetStatistics(accountBookId),
        fetchRecentTransactions(accountBookId)
      ]);

      console.log("所有数据获取完成，更新状态...");
      set({ 
        monthlyStats,
        budgetCategories: budgetData.categories,
        totalBudget: budgetData.totalBudget,
        groupedTransactions: transactions
      });
      console.log("仪表盘状态更新完成");
    } catch (error) {
      console.error("刷新仪表盘数据失败:", error);
      set({ error: "刷新仪表盘数据失败" });
      // 重新抛出异常，让调用者知道刷新失败
      throw error;
    }
  },

  // 清空仪表盘数据
  clearDashboardData: () => {
    set({
      monthlyStats: {
        income: 0,
        expense: 0,
        balance: 0,
        month: formatDate(new Date(), "YYYY年MM月"),
      },
      budgetCategories: [],
      totalBudget: null,
      groupedTransactions: [],
      isLoading: false,
      error: null,
    });
  }
})); 