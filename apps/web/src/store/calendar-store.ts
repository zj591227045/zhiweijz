'use client';

import { create } from 'zustand';
import { transactionService } from '@/lib/api-services';
import dayjs from 'dayjs';

// 交易类型
export type TransactionType = 'INCOME' | 'EXPENSE';

// 每日统计数据
export interface DailyStats {
  date: string; // YYYY-MM-DD
  income: number;
  expense: number;
  count: number;
}

// 交易记录
export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryName: string;
  categoryIcon?: string;
  description?: string;
  date: string;
}

// 按日期分组的交易
export interface GroupedTransactions {
  date: string;
  transactions: Transaction[];
}

// 日历视图状态
interface CalendarState {
  // 当前选中月份
  currentMonth: string; // YYYY-MM
  
  // 每日统计数据
  dailyStats: DailyStats[];
  
  // 选中日期的交易记录
  selectedDate: string | null; // YYYY-MM-DD
  selectedTransactions: Transaction[];
  
  // 显示模式：支出或收入
  displayMode: 'expense' | 'income';
  
  // 加载状态
  isLoading: boolean;
  isLoadingTransactions: boolean;
  error: string | null;
  
  // 操作方法
  setCurrentMonth: (month: string) => void;
  setDisplayMode: (mode: 'expense' | 'income') => void;
  fetchMonthlyStats: (accountBookId: string, month: string) => Promise<void>;
  selectDate: (date: string) => void;
  fetchDayTransactions: (accountBookId: string, date: string) => Promise<void>;
  clearSelectedDate: () => void;
  clearCalendarData: () => void;
}

// 获取月度交易统计
const fetchMonthlyTransactions = async (accountBookId: string, month: string) => {
  const startDate = dayjs(month).startOf('month').format('YYYY-MM-DD');
  const endDate = dayjs(month).endOf('month').format('YYYY-MM-DD');
  
  console.log('获取月度交易数据:', { accountBookId, startDate, endDate });
  
  const response = await transactionService.getGroupedTransactions(accountBookId, {
    startDate,
    endDate,
    groupBy: 'date'
  });
  
  console.log('月度交易响应:', response);
  return response;
};

// 处理交易数据，生成每日统计
const processTransactionsToStats = (transactions: any[]): DailyStats[] => {
  const statsMap = new Map<string, DailyStats>();
  
  transactions.forEach((tx: any) => {
    const date = dayjs(tx.date).format('YYYY-MM-DD');
    
    if (!statsMap.has(date)) {
      statsMap.set(date, {
        date,
        income: 0,
        expense: 0,
        count: 0
      });
    }
    
    const stats = statsMap.get(date)!;
    stats.count++;
    
    if (tx.type === 'INCOME') {
      stats.income += tx.amount;
    } else {
      stats.expense += tx.amount;
    }
  });
  
  return Array.from(statsMap.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

// 获取指定日期的交易记录
const fetchDayTransactions = async (accountBookId: string, date: string) => {
  console.log('获取指定日期交易:', { accountBookId, date });
  
  const response = await transactionService.getGroupedTransactions(accountBookId, {
    startDate: date,
    endDate: date,
    sort: 'date:desc'
  });
  
  console.log('指定日期交易响应:', response);
  
  if (response?.data && Array.isArray(response.data)) {
    return response.data.map((tx: any) => ({
      id: tx.id,
      amount: tx.amount,
      type: tx.type,
      categoryName: tx.category?.name || '未分类',
      categoryIcon: tx.category?.icon || 'other',
      description: tx.description || '',
      date: tx.date,
    }));
  }
  
  return [];
};

// 创建日历状态管理
export const useCalendarStore = create<CalendarState>((set, get) => ({
  // 初始状态
  currentMonth: dayjs().format('YYYY-MM'),
  dailyStats: [],
  selectedDate: null,
  selectedTransactions: [],
  displayMode: 'expense',
  isLoading: false,
  isLoadingTransactions: false,
  error: null,
  
  // 设置当前月份
  setCurrentMonth: (month: string) => {
    set({ currentMonth: month });
  },
  
  // 设置显示模式
  setDisplayMode: (mode: 'expense' | 'income') => {
    set({ displayMode: mode });
  },
  
  // 获取月度统计数据
  fetchMonthlyStats: async (accountBookId: string, month: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetchMonthlyTransactions(accountBookId, month);
      
      if (response?.data && Array.isArray(response.data)) {
        const dailyStats = processTransactionsToStats(response.data);
        set({ dailyStats, isLoading: false });
      } else {
        set({ dailyStats: [], isLoading: false });
      }
    } catch (error) {
      console.error('获取月度统计失败:', error);
      set({ 
        isLoading: false, 
        error: '获取月度统计失败',
        dailyStats: []
      });
    }
  },
  
  // 选择日期
  selectDate: (date: string) => {
    set({ selectedDate: date });
  },
  
  // 获取指定日期的交易记录
  fetchDayTransactions: async (accountBookId: string, date: string) => {
    try {
      set({ isLoadingTransactions: true });
      
      const transactions = await fetchDayTransactions(accountBookId, date);
      
      set({ 
        selectedTransactions: transactions,
        isLoadingTransactions: false 
      });
    } catch (error) {
      console.error('获取当日交易失败:', error);
      set({ 
        isLoadingTransactions: false,
        selectedTransactions: []
      });
    }
  },
  
  // 清除选中日期
  clearSelectedDate: () => {
    set({ 
      selectedDate: null,
      selectedTransactions: []
    });
  },
  
  // 清空日历数据
  clearCalendarData: () => {
    set({
      currentMonth: dayjs().format('YYYY-MM'),
      dailyStats: [],
      selectedDate: null,
      selectedTransactions: [],
      displayMode: 'expense',
      isLoading: false,
      isLoadingTransactions: false,
      error: null,
    });
  },
}));