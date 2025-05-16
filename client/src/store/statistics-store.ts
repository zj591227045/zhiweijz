import { create } from "zustand";
import { getFinancialOverview } from "@/lib/api-services";
import { StatisticsResponse } from "@/types";

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
  fetchStatisticsData: (startDate: string, endDate: string, accountBookId?: string) => Promise<void>;
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
    try {
      set({ isLoading: true, error: null });
      const data = await getFinancialOverview(startDate, endDate, accountBookId);
      set({ statisticsData: data });
      return data;
    } catch (error) {
      console.error("获取统计数据失败:", error);
      set({ error: error as Error });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  // 重置状态
  reset: () => set({
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
