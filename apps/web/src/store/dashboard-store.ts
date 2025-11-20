'use client';

import { create } from 'zustand';
import { statisticsService, budgetService, transactionService } from '@/lib/api-services';
import { formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
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

  // 分页加载相关状态
  isLoadingMore: boolean;
  hasMoreTransactions: boolean;
  currentPage: number;
  totalTransactionsCount: number;
  autoRefreshCount: number; // 自动刷新计数
  showBackToTop: boolean; // 是否显示返回顶部按钮

  // 操作方法
  fetchDashboardData: (accountBookId: string) => Promise<void>;
  refreshDashboardData: (accountBookId: string) => Promise<void>;
  clearDashboardData: () => void;
  // 新增：监听记账变化的方法
  setupTransactionListener: () => void;
  cleanupTransactionListener: () => void;

  // 新增：分页加载方法
  loadMoreTransactions: (accountBookId: string) => Promise<void>;
  resetTransactionPagination: () => void;
  incrementAutoRefreshCount: () => void;
  setShowBackToTop: (show: boolean) => void;
}

// 获取月度统计的辅助函数
const fetchMonthlyStatistics = async (accountBookId: string) => {
  console.log('开始获取月度统计数据...');
  const startDate = dayjs().startOf('month').format('YYYY-MM-DD');
  const endDate = dayjs().endOf('month').format('YYYY-MM-DD');

  const response = await statisticsService.getStatistics(accountBookId, {
    startDate,
    endDate,
  });

  console.log('月度统计数据响应:', response);

  return {
    income: response?.income || 0,
    expense: response?.expense || 0,
    balance: response?.netIncome || 0,
    month: formatDate(new Date(), 'YYYY年MM月'),
  };
};

// 获取预算统计的辅助函数
const fetchBudgetStatistics = async (accountBookId: string) => {
  console.log('开始获取预算统计数据...');
  const currentMonth = dayjs().format('YYYY-MM');

  const response = await budgetService.getBudgetStatistics(accountBookId, {
    month: currentMonth,
  });

  console.log('预算统计数据响应:', response);

  const categories =
    response?.categories?.map((cat: any) => ({
      id: cat.category.id,
      name: cat.category.name,
      icon: cat.category.icon,
      budget: cat.budget,
      spent: cat.spent,
      percentage: cat.percentage,
      period: cat.period || 'MONTHLY',
      categoryId: cat.category.id,
    })) || [];

  // 直接使用后端返回的百分比，不重新计算
  const totalBudget =
    response?.totalBudget && response?.totalSpent !== undefined
      ? {
          amount: response.totalBudget,
          spent: response.totalSpent,
          percentage: response.percentage || 0, // 直接使用后端计算的百分比
        }
      : null;

  console.log('处理后的总预算数据:', totalBudget);

  return { categories, totalBudget };
};

// 获取最近记账的辅助函数
const fetchRecentTransactions = async (accountBookId: string, page: number = 1, limit: number = 20) => {
  console.log(`开始获取最近记账数据，页码: ${page}, 每页: ${limit}...`);

  // 使用通用的transactions接口，支持分页
  const transactionsResponse = await apiClient.get('/transactions', {
    params: {
      accountBookId,
      page,
      limit,
      sort: 'date:desc',
      includeAttachments: true,
    },
  });
  console.log('最近记账数据响应:', transactionsResponse);

  if (transactionsResponse?.data && Array.isArray(transactionsResponse.data)) {
    const groupedByDate: Record<string, any[]> = {};

    transactionsResponse.data.forEach((tx: any) => {
      const dateKey = dayjs(tx.date).format('YYYY-MM-DD');
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(tx);
    });

    const formattedTransactions = Object.keys(groupedByDate)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((dateKey) => {
        return {
          date: formatDate(dateKey, 'MM月DD日'),
          transactions: groupedByDate[dateKey].map((tx: any) => ({
            id: tx.id,
            amount: tx.amount,
            type: tx.type,
            categoryName: tx.category?.name || '未分类',
            categoryIcon: tx.category?.icon || 'other',
            description: tx.description || '',
            date: tx.date,
            category: tx.category,
            tags: tx.tags,
            attachments: tx.attachments || [], // 保留附件信息
            attachmentCount: tx.attachmentCount || 0, // 保留附件数量
          })),
        };
      });

    console.log('格式化后的记账数据:', formattedTransactions);

    // 返回格式化后的数据和分页信息
    return {
      transactions: formattedTransactions,
      hasMore: transactionsResponse.data.length === limit &&
                page * limit < (transactionsResponse.total || 0),
      total: transactionsResponse.total || 0,
      currentPage: page,
    };
  }

  // 返回空数据和分页信息
  return {
    transactions: [],
    hasMore: false,
    total: 0,
    currentPage: page,
  };
};

// 创建仪表盘状态管理
export const useDashboardStore = create<DashboardState>((set, get) => {
  // 事件处理函数，需要在外部定义以便正确移除
  let transactionChangeHandler: ((event: CustomEvent) => void) | null = null;

  return {
    // 初始状态
    monthlyStats: {
      income: 0,
      expense: 0,
      balance: 0,
      month: formatDate(new Date(), 'YYYY年MM月'),
    },
    budgetCategories: [],
    totalBudget: null,
    groupedTransactions: [],
    isLoading: false,
    error: null,

    // 分页加载相关状态
    isLoadingMore: false,
    hasMoreTransactions: true,
    currentPage: 1,
    totalTransactionsCount: 0,
    autoRefreshCount: 0,
    showBackToTop: false,

    // 获取仪表盘数据
    fetchDashboardData: async (accountBookId: string) => {
      try {
        set({ isLoading: true, error: null, currentPage: 1 });

        // 并行请求数据
        const [monthlyStats, budgetData, transactionData] = await Promise.all([
          fetchMonthlyStatistics(accountBookId),
          fetchBudgetStatistics(accountBookId),
          fetchRecentTransactions(accountBookId, 1, 20),
        ]);

        set({
          monthlyStats,
          budgetCategories: budgetData.categories,
          totalBudget: budgetData.totalBudget,
          groupedTransactions: transactionData.transactions,
          hasMoreTransactions: transactionData.hasMore,
          totalTransactionsCount: transactionData.total,
          currentPage: transactionData.currentPage,
          isLoading: false,
        });
      } catch (error) {
        console.error('获取仪表盘数据失败:', error);
        set({
          isLoading: false,
          error: '获取仪表盘数据失败',
        });
      }
    },

    // 刷新仪表盘数据（不显示加载状态）
    refreshDashboardData: async (accountBookId: string) => {
      try {
        set({ error: null, currentPage: 1 });
        console.log(`开始刷新仪表盘数据，账本ID: ${accountBookId}`);

        // 注意：当前使用的apiClient不支持缓存，所以总是获取最新数据
        console.log('开始获取最新数据...');

        // 并行请求数据
        const [monthlyStats, budgetData, transactionData] = await Promise.all([
          fetchMonthlyStatistics(accountBookId),
          fetchBudgetStatistics(accountBookId),
          fetchRecentTransactions(accountBookId, 1, 20),
        ]);

        console.log('所有数据获取完成，更新状态...');
        set({
          monthlyStats,
          budgetCategories: budgetData.categories,
          totalBudget: budgetData.totalBudget,
          groupedTransactions: transactionData.transactions,
          hasMoreTransactions: transactionData.hasMore,
          totalTransactionsCount: transactionData.total,
          currentPage: transactionData.currentPage,
        });
        console.log('仪表盘状态更新完成');
      } catch (error) {
        console.error('刷新仪表盘数据失败:', error);
        set({ error: '刷新仪表盘数据失败' });
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
          month: formatDate(new Date(), 'YYYY年MM月'),
        },
        budgetCategories: [],
        totalBudget: null,
        groupedTransactions: [],
        isLoading: false,
        error: null,

        // 重置分页状态
        isLoadingMore: false,
        hasMoreTransactions: true,
        currentPage: 1,
        totalTransactionsCount: 0,
        autoRefreshCount: 0,
        showBackToTop: false,
      });
    },

    // 加载更多交易记录
    loadMoreTransactions: async (accountBookId: string) => {
      const currentState = get();

      // 如果正在加载或没有更多数据，直接返回
      if (currentState.isLoadingMore || !currentState.hasMoreTransactions || currentState.isLoading) {
        return;
      }

      try {
        console.log(`加载更多交易记录，当前页: ${currentState.currentPage}`);

        set({ isLoadingMore: true });

        const nextPage = currentState.currentPage + 1;
        const transactionData = await fetchRecentTransactions(accountBookId, nextPage, 20);

        // 合并新旧交易记录
        const updatedTransactions = [...currentState.groupedTransactions, ...transactionData.transactions];

        set({
          groupedTransactions: updatedTransactions,
          hasMoreTransactions: transactionData.hasMore,
          totalTransactionsCount: transactionData.total,
          currentPage: transactionData.currentPage,
          isLoadingMore: false,
        });

        console.log(`成功加载更多交易记录，新记录数: ${transactionData.transactions.length}`);

        // 每次加载更多记录后增加自动刷新计数
        const updatedState = get(); // 重新获取最新状态
        const newCount = updatedState.autoRefreshCount + 1;

        // 在2次自动刷新后显示返回顶部按钮
        if (newCount >= 2) {
          set({
            autoRefreshCount: newCount,
            showBackToTop: true
          });
        } else {
          set({ autoRefreshCount: newCount });
        }
      } catch (error) {
        console.error('加载更多交易记录失败:', error);
        set({ isLoadingMore: false });
      }
    },

    // 重置交易分页状态
    resetTransactionPagination: () => {
      set({
        isLoadingMore: false,
        hasMoreTransactions: true,
        currentPage: 1,
        totalTransactionsCount: 0,
        autoRefreshCount: 0,
        showBackToTop: false,
      });
    },

    // 增加自动刷新计数
    incrementAutoRefreshCount: () => {
      const currentState = get();
      const newCount = currentState.autoRefreshCount + 1;

      // 在2次自动刷新后显示返回顶部按钮
      if (newCount >= 2) {
        set({
          autoRefreshCount: newCount,
          showBackToTop: true
        });
      } else {
        set({ autoRefreshCount: newCount });
      }
    },

    // 设置是否显示返回顶部按钮
    setShowBackToTop: (show: boolean) => {
      set({ showBackToTop: show });
    },

    // 设置记账变化监听器
    setupTransactionListener: () => {
      // 确保在浏览器环境中
      if (typeof window === 'undefined') {
        console.warn('setupTransactionListener: 不在浏览器环境中，跳过监听器设置');
        return;
      }

      // 如果已经有监听器，先清理
      if (transactionChangeHandler) {
        window.removeEventListener('transactionChanged', transactionChangeHandler as EventListener);
        console.log('清理旧的记账变化监听器');
      }

      // 创建新的事件处理函数
      transactionChangeHandler = (event: CustomEvent) => {
        const { accountBookId } = event.detail;
        console.log('监听到记账变化事件，账本ID:', accountBookId);

        // 延迟刷新，确保数据库操作已完成
        setTimeout(() => {
          console.log('开始自动刷新仪表盘数据...');
          get()
            .refreshDashboardData(accountBookId)
            .catch((error) => {
              console.error('自动刷新仪表盘数据失败:', error);
            });
        }, 500);
      };

      window.addEventListener('transactionChanged', transactionChangeHandler as EventListener);
      console.log('仪表盘记账变化监听器已设置');
    },

    // 清理记账变化监听器
    cleanupTransactionListener: () => {
      // 确保在浏览器环境中
      if (typeof window === 'undefined') {
        return;
      }

      if (transactionChangeHandler) {
        window.removeEventListener('transactionChanged', transactionChangeHandler as EventListener);
        transactionChangeHandler = null;
        console.log('仪表盘记账变化监听器已清理');
      }
    },
  };
});

// 全局函数：触发记账变化事件
export const triggerTransactionChange = (accountBookId: string) => {
  // 确保在浏览器环境中
  if (typeof window === 'undefined') {
    console.warn('triggerTransactionChange: 不在浏览器环境中，跳过事件触发');
    return;
  }

  console.log('触发记账变化事件，账本ID:', accountBookId);

  // 方法1：使用自定义事件
  const event = new CustomEvent('transactionChanged', {
    detail: { accountBookId },
  });
  window.dispatchEvent(event);
  console.log('记账变化事件已触发');

  // 方法2：使用localStorage作为备用机制
  const refreshSignal = {
    accountBookId,
    timestamp: Date.now(),
    action: 'refresh_dashboard',
  };
  localStorage.setItem('dashboard_refresh_signal', JSON.stringify(refreshSignal));
  console.log('仪表盘刷新信号已写入localStorage');
};
