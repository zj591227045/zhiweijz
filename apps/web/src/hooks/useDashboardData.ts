/**
 * 仪表盘数据获取hook - React Query版本
 * 
 * 这是对原有dashboard-store的React Query替代方案
 * 保持相同的接口，但使用React Query进行数据管理
 */

'use client';

import { useDashboardData as useReactQueryDashboard } from './queries/useDashboardQueries';
import { useAccountBooks } from './useAccountBooks';
import { createLogger } from '@/lib/logger';

const dashboardLogger = createLogger('Dashboard');

/**
 * 仪表盘数据hook
 * 
 * 使用React Query替代手动状态管理，提供相同的接口
 */
export function useDashboardData() {
  const { currentAccountBook } = useAccountBooks();
  const accountBookId = currentAccountBook?.id || null;

  const {
    monthlyStats,
    budgetCategories,
    totalBudget,
    groupedTransactions,
    isLoading,
    isLoadingMore,
    error,
    hasMoreTransactions,
    loadMoreTransactions,
    refreshAll,
    queries,
  } = useReactQueryDashboard(accountBookId);

  // 记录数据获取状态
  if (accountBookId && !isLoading && monthlyStats) {
    dashboardLogger.debug('仪表盘数据已加载', {
      accountBookId,
      monthlyStats: {
        income: monthlyStats.income,
        expense: monthlyStats.expense,
        balance: monthlyStats.balance,
      },
      budgetCategoriesCount: budgetCategories.length,
      transactionsCount: groupedTransactions.length,
    });
  }

  if (error) {
    dashboardLogger.error('仪表盘数据加载失败', error);
  }

  return {
    // 数据状态 - 与原dashboard-store保持一致的接口
    monthlyStats: monthlyStats || {
      income: 0,
      expense: 0,
      balance: 0,
      month: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }),
    },
    budgetCategories,
    totalBudget,
    groupedTransactions,
    
    // 加载状态
    isLoading,
    isLoadingMore,
    error: error ? (error instanceof Error ? error.message : '获取仪表盘数据失败') : null,
    
    // 分页状态
    hasMoreTransactions: hasMoreTransactions || false,
    
    // 操作方法 - 保持与原store相同的方法签名
    fetchDashboardData: async (accountBookId: string) => {
      dashboardLogger.info('手动刷新仪表盘数据', { accountBookId });
      refreshAll();
    },
    
    refreshDashboardData: async (accountBookId: string) => {
      dashboardLogger.info('刷新仪表盘数据', { accountBookId });
      refreshAll();
    },
    
    loadMoreTransactions: async (accountBookId: string) => {
      if (hasMoreTransactions && !isLoadingMore) {
        dashboardLogger.debug('加载更多交易记录', { accountBookId });
        await loadMoreTransactions();
      }
    },
    
    clearDashboardData: () => {
      dashboardLogger.debug('清空仪表盘数据（React Query版本不需要手动清理）');
      // React Query会自动管理缓存，不需要手动清理
    },
    
    // 新增：直接访问React Query状态的方法（用于高级用法）
    queries,
    
    // 兼容性：保持原有的状态字段
    currentPage: 1, // React Query使用无限滚动，不需要页码
    totalTransactionsCount: groupedTransactions.length,
    autoRefreshCount: 0, // React Query自动管理，不需要手动计数
    showBackToTop: false, // UI状态，应该由组件自己管理
    
    // 兼容性：保持原有的方法（但实际上不需要）
    setupTransactionListener: () => {
      dashboardLogger.debug('React Query版本不需要手动设置监听器');
    },
    
    cleanupTransactionListener: () => {
      dashboardLogger.debug('React Query版本不需要手动清理监听器');
    },
    
    resetTransactionPagination: () => {
      dashboardLogger.debug('React Query版本使用无限滚动，不需要重置分页');
    },
    
    incrementAutoRefreshCount: () => {
      dashboardLogger.debug('React Query版本自动管理刷新，不需要手动计数');
    },
    
    setShowBackToTop: (show: boolean) => {
      dashboardLogger.debug('UI状态应该由组件自己管理', { show });
    },
  };
}