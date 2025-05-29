import { create } from 'zustand';
import { StorageAdapter } from '../adapters/storage-adapter';

// 预算类型枚举
export enum BudgetType {
  PERSONAL = "PERSONAL",
  GENERAL = "GENERAL",
}

// 预算接口
export interface Budget {
  id: string;
  name: string;
  amount: number;
  budgetType: BudgetType;
  accountBookId: string;
  startDate?: string;
  endDate?: string;
  isUnlimited?: boolean;
  refreshDay?: number;
  enableRollover?: boolean;
  rolloverAmount?: number;
  createdAt: string;
  updatedAt: string;
}

// 创建预算数据接口
export interface CreateBudgetData {
  name: string;
  amount: number;
  budgetType: BudgetType;
  accountBookId: string;
  startDate?: string;
  endDate?: string;
  isUnlimited?: boolean;
  refreshDay?: number;
  enableRollover?: boolean;
  rolloverAmount?: number;
}

// 更新预算数据接口
export interface UpdateBudgetData {
  name?: string;
  amount?: number;
  startDate?: string;
  endDate?: string;
  isUnlimited?: boolean;
  refreshDay?: number;
  enableRollover?: boolean;
  rolloverAmount?: number;
}

// 预算状态接口
export interface BudgetState {
  budgets: Budget[];
  isLoading: boolean;
  error: string | null;
  currentAccountBookId?: string;
  
  fetchBudgets: (accountBookId: string, budgetType?: BudgetType) => Promise<void>;
  fetchActiveBudgets: (accountBookId: string) => Promise<void>;
  getBudget: (id: string) => Promise<Budget | null>;
  createBudget: (data: CreateBudgetData) => Promise<boolean>;
  updateBudget: (id: string, data: UpdateBudgetData) => Promise<boolean>;
  deleteBudget: (id: string) => Promise<boolean>;
  clearError: () => void;
}

// 预算store选项接口
export interface BudgetStoreOptions {
  apiClient: any;
  storage: StorageAdapter;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export const createBudgetStore = (options: BudgetStoreOptions) => {
  const { apiClient, storage, onSuccess, onError } = options;

  return create<BudgetState>((set, get) => ({
    budgets: [],
    isLoading: false,
    error: null,
    currentAccountBookId: undefined,

    // 获取预算列表
    fetchBudgets: async (accountBookId: string, budgetType?: BudgetType) => {
      try {
        set({ isLoading: true, error: null, currentAccountBookId: accountBookId });
        
        const params: Record<string, string> = { accountBookId };
        if (budgetType) params.budgetType = budgetType;
        
        const response = await apiClient.get('/budgets', { params });
        
        // 处理不同的响应格式
        let budgets = [];
        if (response && typeof response === 'object') {
          if ('data' in response && Array.isArray(response.data)) {
            budgets = response.data;
          } else if (Array.isArray(response)) {
            budgets = response;
          }
        }
        
        set({
          budgets,
          isLoading: false
        });
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '获取预算列表失败';
        set({
          isLoading: false,
          error: errorMessage,
        });
        
        if (onError) {
          onError(errorMessage);
        }
      }
    },

    // 获取活跃预算
    fetchActiveBudgets: async (accountBookId: string) => {
      try {
        set({ isLoading: true, error: null, currentAccountBookId: accountBookId });
        
        const response = await apiClient.get('/budgets/active', { 
          params: { accountBookId } 
        });
        
        // 处理不同的响应格式
        let budgets = [];
        if (response && typeof response === 'object') {
          if ('data' in response && Array.isArray(response.data)) {
            budgets = response.data;
          } else if (Array.isArray(response)) {
            budgets = response;
          }
        }
        
        set({
          budgets,
          isLoading: false
        });
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '获取活跃预算失败';
        set({
          isLoading: false,
          error: errorMessage,
        });
        
        if (onError) {
          onError(errorMessage);
        }
      }
    },

    // 获取单个预算
    getBudget: async (id: string) => {
      try {
        const response = await apiClient.get(`/budgets/${id}`);
        
        // 处理响应格式
        let budget = null;
        if (response && typeof response === 'object') {
          if ('data' in response) {
            budget = response.data;
          } else {
            budget = response;
          }
        }
        
        return budget;
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '获取预算详情失败';
        set({ error: errorMessage });
        
        if (onError) {
          onError(errorMessage);
        }
        
        return null;
      }
    },

    // 创建预算
    createBudget: async (data: CreateBudgetData) => {
      try {
        set({ isLoading: true, error: null });
        
        await apiClient.post('/budgets', data);
        
        set({ isLoading: false });
        
        if (onSuccess) {
          onSuccess('预算创建成功');
        }
        
        return true;
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '创建预算失败';
        set({
          isLoading: false,
          error: errorMessage,
        });
        
        if (onError) {
          onError(errorMessage);
        }
        
        return false;
      }
    },

    // 更新预算
    updateBudget: async (id: string, data: UpdateBudgetData) => {
      try {
        set({ isLoading: true, error: null });
        
        await apiClient.put(`/budgets/${id}`, data);
        
        set({ isLoading: false });
        
        if (onSuccess) {
          onSuccess('预算更新成功');
        }
        
        return true;
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '更新预算失败';
        set({
          isLoading: false,
          error: errorMessage,
        });
        
        if (onError) {
          onError(errorMessage);
        }
        
        return false;
      }
    },

    // 删除预算
    deleteBudget: async (id: string) => {
      try {
        set({ isLoading: true, error: null });
        
        await apiClient.delete(`/budgets/${id}`);
        
        set({ isLoading: false });
        
        if (onSuccess) {
          onSuccess('预算删除成功');
        }
        
        return true;
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '删除预算失败';
        set({
          isLoading: false,
          error: errorMessage,
        });
        
        if (onError) {
          onError(errorMessage);
        }
        
        return false;
      }
    },

    // 清除错误
    clearError: () => {
      set({ error: null });
    },
  }));
};
