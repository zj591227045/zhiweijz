import { create } from "zustand";
import { TransactionType } from "@/types";
import dayjs from "dayjs";

// 日期范围类型
export type DateRangeType = "current-month" | "last-month" | "custom";

// 获取当前月份的开始和结束日期
const getCurrentMonthRange = () => {
  const now = dayjs();
  return {
    startDate: now.startOf("month").format("YYYY-MM-DD"),
    endDate: now.endOf("month").format("YYYY-MM-DD"),
  };
};

// 获取上个月的开始和结束日期
const getLastMonthRange = () => {
  const lastMonth = dayjs().subtract(1, "month");
  return {
    startDate: lastMonth.startOf("month").format("YYYY-MM-DD"),
    endDate: lastMonth.endOf("month").format("YYYY-MM-DD"),
  };
};

// 交易列表状态接口
interface TransactionListState {
  // 筛选条件
  dateRangeType: DateRangeType;
  startDate: string;
  endDate: string;
  transactionType: TransactionType | "ALL";
  categoryIds: string[];
  accountBookId: string | null;
  
  // 筛选面板状态
  isFilterPanelOpen: boolean;
  
  // 加载状态
  isRefreshing: boolean;
  isLoadingMore: boolean;
  
  // 方法
  setDateRangeType: (type: DateRangeType) => void;
  setDateRange: (startDate: string, endDate: string) => void;
  setTransactionType: (type: TransactionType | "ALL") => void;
  setCategoryIds: (ids: string[]) => void;
  toggleCategoryId: (id: string) => void;
  setAccountBookId: (id: string | null) => void;
  toggleFilterPanel: () => void;
  setIsRefreshing: (isRefreshing: boolean) => void;
  setIsLoadingMore: (isLoadingMore: boolean) => void;
  resetFilters: () => void;
}

// 创建状态存储
export const useTransactionListStore = create<TransactionListState>((set) => {
  // 获取当前月份的日期范围
  const { startDate, endDate } = getCurrentMonthRange();
  
  return {
    // 初始状态
    dateRangeType: "current-month",
    startDate,
    endDate,
    transactionType: "ALL",
    categoryIds: [],
    accountBookId: null,
    isFilterPanelOpen: false,
    isRefreshing: false,
    isLoadingMore: false,
    
    // 设置日期范围类型
    setDateRangeType: (type) => set((state) => {
      let newStartDate = state.startDate;
      let newEndDate = state.endDate;
      
      if (type === "current-month") {
        const range = getCurrentMonthRange();
        newStartDate = range.startDate;
        newEndDate = range.endDate;
      } else if (type === "last-month") {
        const range = getLastMonthRange();
        newStartDate = range.startDate;
        newEndDate = range.endDate;
      }
      
      return {
        dateRangeType: type,
        startDate: newStartDate,
        endDate: newEndDate,
      };
    }),
    
    // 设置自定义日期范围
    setDateRange: (startDate, endDate) => set({
      dateRangeType: "custom",
      startDate,
      endDate,
    }),
    
    // 设置交易类型
    setTransactionType: (type) => set({ transactionType: type }),
    
    // 设置分类ID列表
    setCategoryIds: (ids) => set({ categoryIds: ids }),
    
    // 切换分类ID（添加或移除）
    toggleCategoryId: (id) => set((state) => {
      const exists = state.categoryIds.includes(id);
      return {
        categoryIds: exists
          ? state.categoryIds.filter((categoryId) => categoryId !== id)
          : [...state.categoryIds, id],
      };
    }),
    
    // 设置账本ID
    setAccountBookId: (id) => set({ accountBookId: id }),
    
    // 切换筛选面板显示状态
    toggleFilterPanel: () => set((state) => ({
      isFilterPanelOpen: !state.isFilterPanelOpen,
    })),
    
    // 设置刷新状态
    setIsRefreshing: (isRefreshing) => set({ isRefreshing }),
    
    // 设置加载更多状态
    setIsLoadingMore: (isLoadingMore) => set({ isLoadingMore }),
    
    // 重置所有筛选条件
    resetFilters: () => {
      const { startDate, endDate } = getCurrentMonthRange();
      set({
        dateRangeType: "current-month",
        startDate,
        endDate,
        transactionType: "ALL",
        categoryIds: [],
      });
    },
  };
});
