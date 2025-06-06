import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import { StatisticsResponse } from '@/types';
import { toast } from 'sonner';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface StatisticsState {
  // 数据状态
  statisticsData: StatisticsResponse | null;
  isLoading: boolean;
  error: Error | null;

  // 视图状态
  dateRange: DateRange;
  categoryChartType: 'pie' | 'bar';
  trendChartPeriod: 'day' | 'week' | 'month';
  selectedCategoryType: 'expense' | 'income';

  // 操作方法
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  setDateRange: (dateRange: DateRange) => void;
  setCategoryChartType: (type: 'pie' | 'bar') => void;
  setTrendChartPeriod: (period: 'day' | 'week' | 'month') => void;
  setSelectedCategoryType: (type: 'expense' | 'income') => void;
  fetchStatisticsData: (
    startDate: string,
    endDate: string,
    accountBookId?: string,
  ) => Promise<void>;
  reset: () => void;
}

export const useStatisticsStore = create<StatisticsState>((set, get) => ({
  // 初始状态
  statisticsData: null,
  isLoading: false,
  error: null,
  dateRange: {
    startDate: '',
    endDate: '',
  },
  categoryChartType: 'pie',
  trendChartPeriod: 'day',
  selectedCategoryType: 'expense',

  // 操作方法
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setDateRange: (dateRange) => set({ dateRange }),
  setCategoryChartType: (type) => set({ categoryChartType: type }),
  setTrendChartPeriod: (period) => set({ trendChartPeriod: period }),
  setSelectedCategoryType: (type) => set({ selectedCategoryType: type }),

  // 获取统计数据
  fetchStatisticsData: async (startDate, endDate, accountBookId) => {
    console.log('开始获取统计数据:', { startDate, endDate, accountBookId });
    try {
      set({ isLoading: true, error: null });

      let url = `/statistics/overview?startDate=${startDate}&endDate=${endDate}`;
      if (accountBookId) {
        url += `&accountBookId=${accountBookId}`;
      }

      const response = await apiClient.get(url);
      console.log('获取到的统计数据:', response);

      // 将API响应转换为前端组件期望的数据结构
      const transformedResponse: StatisticsResponse = {
        totalIncome: response.income || 0,
        totalExpense: response.expense || 0,
        balance: response.netIncome || 0,
        incomeByCategory: Array.isArray(response.topIncomeCategories)
          ? response.topIncomeCategories.map((cat: any) => ({
              categoryId: cat.category?.id || '',
              categoryName: cat.category?.name || '',
              amount: cat.amount || 0,
              percentage: cat.percentage || 0,
            }))
          : [],
        expenseByCategory: Array.isArray(response.topExpenseCategories)
          ? response.topExpenseCategories.map((cat: any) => ({
              categoryId: cat.category?.id || '',
              categoryName: cat.category?.name || '',
              amount: cat.amount || 0,
              percentage: cat.percentage || 0,
            }))
          : [],
        // 使用API返回的每日统计数据
        dailyStatistics: response.dailyStatistics || [],
      };

      set({
        statisticsData: transformedResponse,
        dateRange: { startDate, endDate },
        isLoading: false,
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
      set({ error: error as Error, isLoading: false });
      toast.error('获取统计数据失败，请重试');
    }
  },

  // 重置状态
  reset: () =>
    set({
      statisticsData: null,
      isLoading: false,
      error: null,
      dateRange: {
        startDate: '',
        endDate: '',
      },
      categoryChartType: 'pie',
      trendChartPeriod: 'day',
      selectedCategoryType: 'expense',
    }),
}));
