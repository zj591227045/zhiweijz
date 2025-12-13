/**
 * 仪表盘相关的React Query hooks
 * 
 * 用于替换dashboard-store中的手动fetch，消除重复请求
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { statisticsService, budgetService } from '@/lib/api-services';
import { apiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import dayjs from 'dayjs';
import { createLogger } from '@/lib/logger';

const dashboardLogger = createLogger('Dashboard');

// 查询键常量
export const DASHBOARD_KEYS = {
  all: ['dashboard'] as const,
  monthlyStats: (accountBookId: string) => [...DASHBOARD_KEYS.all, 'monthlyStats', accountBookId] as const,
  budgetStats: (accountBookId: string) => [...DASHBOARD_KEYS.all, 'budgetStats', accountBookId] as const,
  transactions: (accountBookId: string) => [...DASHBOARD_KEYS.all, 'transactions', accountBookId] as const,
} as const;

/**
 * 获取月度统计数据
 */
export function useMonthlyStats(accountBookId: string | null) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.monthlyStats(accountBookId || ''),
    queryFn: async () => {
      if (!accountBookId) throw new Error('账本ID不能为空');
      
      dashboardLogger.debug('获取月度统计数据', { accountBookId });
      
      const startDate = dayjs().startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs().endOf('month').format('YYYY-MM-DD');

      const response = await statisticsService.getStatistics(accountBookId, {
        startDate,
        endDate,
      });

      const result = {
        income: response?.income || 0,
        expense: response?.expense || 0,
        balance: response?.netIncome || 0,
        month: formatDate(new Date(), 'YYYY年MM月'),
      };

      dashboardLogger.debug('月度统计数据获取成功', result);
      return result;
    },
    enabled: !!accountBookId,
    staleTime: 2 * 60 * 1000, // 2分钟内认为数据是新鲜的
    gcTime: 5 * 60 * 1000,    // 5分钟后清理缓存
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * 获取预算统计数据
 */
export function useBudgetStats(accountBookId: string | null) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.budgetStats(accountBookId || ''),
    queryFn: async () => {
      if (!accountBookId) throw new Error('账本ID不能为空');
      
      dashboardLogger.debug('获取预算统计数据', { accountBookId });
      
      const currentMonth = dayjs().format('YYYY-MM');
      const response = await budgetService.getBudgetStatistics(accountBookId, {
        month: currentMonth,
      });

      const categories = response?.categories?.map((cat: any) => ({
        id: cat.category.id,
        name: cat.category.name,
        icon: cat.category.icon,
        budget: cat.budget,
        spent: cat.spent,
        percentage: cat.percentage,
        period: cat.period || 'MONTHLY',
        categoryId: cat.category.id,
      })) || [];

      const totalBudget = response?.totalBudget && response?.totalSpent !== undefined
        ? {
            amount: response.totalBudget,
            spent: response.totalSpent,
            percentage: response.percentage || 0,
          }
        : null;

      const result = { categories, totalBudget };
      dashboardLogger.debug('预算统计数据获取成功', { 
        categoriesCount: categories.length,
        totalBudget: totalBudget?.amount 
      });
      
      return result;
    },
    enabled: !!accountBookId,
    staleTime: 2 * 60 * 1000, // 2分钟内认为数据是新鲜的
    gcTime: 5 * 60 * 1000,    // 5分钟后清理缓存
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * 获取交易记录（支持无限滚动）
 */
export function useTransactions(accountBookId: string | null) {
  return useInfiniteQuery({
    queryKey: DASHBOARD_KEYS.transactions(accountBookId || ''),
    queryFn: async ({ pageParam = 1 }) => {
      if (!accountBookId) throw new Error('账本ID不能为空');
      
      dashboardLogger.debug('获取交易记录', { 
        accountBookId, 
        page: pageParam 
      });

      const limit = 20;
      const transactionsResponse = await apiClient.get('/transactions', {
        params: {
          accountBookId,
          page: pageParam,
          limit,
          sort: 'date:desc',
          includeAttachments: true,
        },
      });

      if (transactionsResponse?.data && Array.isArray(transactionsResponse.data)) {
        // 按日期分组
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
          .map((dateKey) => ({
            date: formatDate(dateKey, 'MM月DD日'),
            transactions: groupedByDate[dateKey].map((tx: any) => ({
              id: tx.id,
              amount: tx.amount,
              type: tx.type,
              categoryId: tx.categoryId,
              categoryName: tx.category?.name || '未分类',
              categoryIcon: tx.category?.icon || 'other',
              description: tx.description || '',
              date: tx.date,
              category: tx.category,
              budgetId: tx.budgetId,
              isMultiBudget: tx.isMultiBudget,
              budgetAllocation: tx.budgetAllocation,
              tags: tx.tags || [],
              attachments: tx.attachments || [],
              attachmentCount: tx.attachmentCount || 0,
            })),
          }));

        const result = {
          transactions: formattedTransactions,
          hasMore: transactionsResponse.data.length === limit &&
                   pageParam * limit < (transactionsResponse.total || 0),
          total: transactionsResponse.total || 0,
          currentPage: pageParam,
        };

        dashboardLogger.debug('交易记录获取成功', {
          page: pageParam,
          count: formattedTransactions.length,
          hasMore: result.hasMore
        });

        return result;
      }

      return {
        transactions: [],
        hasMore: false,
        total: 0,
        currentPage: pageParam,
      };
    },
    enabled: !!accountBookId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.currentPage + 1 : undefined;
    },
    staleTime: 1 * 60 * 1000, // 1分钟内认为数据是新鲜的（交易数据更新频繁）
    gcTime: 3 * 60 * 1000,    // 3分钟后清理缓存
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * 组合hook：获取完整的仪表盘数据
 */
export function useDashboardData(accountBookId: string | null) {
  const monthlyStats = useMonthlyStats(accountBookId);
  const budgetStats = useBudgetStats(accountBookId);
  const transactions = useTransactions(accountBookId);

  return {
    monthlyStats: monthlyStats.data,
    budgetCategories: budgetStats.data?.categories || [],
    totalBudget: budgetStats.data?.totalBudget || null,
    groupedTransactions: transactions.data?.pages.flatMap(page => page.transactions) || [],
    
    // 加载状态
    isLoading: monthlyStats.isLoading || budgetStats.isLoading || transactions.isLoading,
    isLoadingMore: transactions.isFetchingNextPage,
    
    // 错误状态
    error: monthlyStats.error || budgetStats.error || transactions.error,
    
    // 分页状态
    hasMoreTransactions: transactions.hasNextPage,
    
    // 操作方法
    loadMoreTransactions: transactions.fetchNextPage,
    refreshAll: () => {
      monthlyStats.refetch();
      budgetStats.refetch();
      transactions.refetch();
    },
    
    // 各个查询的独立状态（用于细粒度控制）
    queries: {
      monthlyStats,
      budgetStats,
      transactions,
    },
  };
}