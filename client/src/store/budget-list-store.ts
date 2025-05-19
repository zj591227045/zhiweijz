import { create } from 'zustand';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { useAccountBookStore } from './account-book-store';

// 预算类型
export type BudgetType = 'PERSONAL' | 'GENERAL';

// 预算数据类型
export interface Budget {
  id: string;
  name: string;
  period: string; // 例如: "2023年5月"
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  rolloverAmount?: number;
  daysRemaining: number;
  categoryIcon?: string;
  warning: boolean; // 是否接近超支
  overSpent: boolean; // 是否超支
  budgetType: BudgetType;
}

// 预算列表状态类型
interface BudgetListState {
  // 数据状态
  personalBudgets: Budget[];
  generalBudgets: Budget[];

  // UI状态
  selectedType: BudgetType;
  isLoading: boolean;
  error: string | null;

  // 操作方法
  fetchBudgets: (accountBookId: string) => Promise<void>;
  setSelectedType: (type: BudgetType) => void;
  deleteBudget: (budgetId: string) => Promise<boolean>;
  resetState: () => void;
}

// 创建预算列表状态管理
export const useBudgetListStore = create<BudgetListState>((set, get) => ({
  // 初始数据状态
  personalBudgets: [],
  generalBudgets: [],

  // 初始UI状态
  selectedType: 'PERSONAL',
  isLoading: false,
  error: null,

  // 获取预算列表
  fetchBudgets: async (accountBookId: string) => {
    try {
      set({ isLoading: true, error: null });
      console.log('获取预算列表:', accountBookId);

      // 获取个人预算
      const personalResponse = await apiClient.get('/budgets', {
        params: {
          accountBookId,
          budgetType: 'PERSONAL'
        }
      });

      // 获取通用预算
      const generalResponse = await apiClient.get('/budgets', {
        params: {
          accountBookId,
          budgetType: 'GENERAL'
        }
      });

      console.log('个人预算响应:', personalResponse);
      console.log('通用预算响应:', generalResponse);

      // 处理API响应，确保我们正确获取数据数组
      let personalBudgetsData = [];
      let generalBudgetsData = [];

      // 处理个人预算响应
      if (personalResponse) {
        if (Array.isArray(personalResponse)) {
          personalBudgetsData = personalResponse;
        } else if (personalResponse.data && Array.isArray(personalResponse.data)) {
          personalBudgetsData = personalResponse.data;
        } else if (personalResponse.budgets && Array.isArray(personalResponse.budgets)) {
          personalBudgetsData = personalResponse.budgets;
        }
      }

      // 处理通用预算响应
      if (generalResponse) {
        if (Array.isArray(generalResponse)) {
          generalBudgetsData = generalResponse;
        } else if (generalResponse.data && Array.isArray(generalResponse.data)) {
          generalBudgetsData = generalResponse.data;
        } else if (generalResponse.budgets && Array.isArray(generalResponse.budgets)) {
          generalBudgetsData = generalResponse.budgets;
        }
      }

      console.log('处理后的个人预算数据:', personalBudgetsData);
      console.log('处理后的通用预算数据:', generalBudgetsData);

      // 处理预算数据，添加警告和超支标志
      const processedPersonalBudgets = personalBudgetsData.map((budget: any) => ({
        ...budget,
        warning: budget.percentage >= 80 && budget.percentage < 100,
        overSpent: budget.percentage >= 100
      }));

      const processedGeneralBudgets = generalBudgetsData.map((budget: any) => ({
        ...budget,
        warning: budget.percentage >= 80 && budget.percentage < 100,
        overSpent: budget.percentage >= 100
      }));

      set({
        personalBudgets: processedPersonalBudgets,
        generalBudgets: processedGeneralBudgets,
        isLoading: false
      });
    } catch (error) {
      console.error('获取预算列表失败:', error);
      set({
        isLoading: false,
        error: '获取预算列表失败，请重试'
      });
      toast.error('获取预算列表失败，请重试');
    }
  },

  // 设置选中的预算类型
  setSelectedType: (type: BudgetType) => {
    set({ selectedType: type });
  },

  // 删除预算
  deleteBudget: async (budgetId: string) => {
    try {
      await apiClient.delete(`/budgets/${budgetId}`);

      // 更新状态，移除已删除的预算
      const { personalBudgets, generalBudgets } = get();

      set({
        personalBudgets: personalBudgets.filter(budget => budget.id !== budgetId),
        generalBudgets: generalBudgets.filter(budget => budget.id !== budgetId)
      });

      toast.success('预算已删除');
      return true;
    } catch (error) {
      console.error('删除预算失败:', error);
      toast.error('删除预算失败，请重试');
      return false;
    }
  },

  // 重置状态
  resetState: () => {
    set({
      personalBudgets: [],
      generalBudgets: [],
      selectedType: 'PERSONAL',
      isLoading: false,
      error: null
    });
  }
}));
