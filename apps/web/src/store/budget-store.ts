'use client';

import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Budget } from '@/types';

// 预算状态类型
interface BudgetState {
  // 数据状态
  budgets: Budget[];
  isLoading: boolean;
  error: string | null;
  currentAccountBookId?: string;

  // 操作方法
  fetchBudgets: (accountBookId?: string) => Promise<void>;
  fetchActiveBudgets: (accountBookId?: string) => Promise<void>;
  getBudget: (id: string) => Promise<Budget | null>;
  createBudget: (data: {
    amount: number;
    categoryId: string;
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    startDate: string;
    endDate?: string;
    accountBookId: string;
  }) => Promise<boolean>;
  updateBudget: (
    id: string,
    data: {
      amount?: number;
      categoryId?: string;
      period?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
      startDate?: string;
      endDate?: string;
    },
  ) => Promise<boolean>;
  deleteBudget: (id: string) => Promise<boolean>;
  refreshBudgets: () => Promise<void>;
  setCurrentAccountBookId: (accountBookId: string) => void;
}

// 创建预算状态管理
export const useBudgetStore = create<BudgetState>((set, get) => ({
  // 初始状态
  budgets: [],
  isLoading: false,
  error: null,
  currentAccountBookId: undefined,

  // 获取预算列表
  fetchBudgets: async (accountBookId) => {
    try {
      set({ isLoading: true, error: null });

      const params: Record<string, string> = {};
      if (accountBookId) params.accountBookId = accountBookId;

      const response = await apiClient.get('/budgets', { params });

      // 处理不同的响应格式
      if (response && typeof response === 'object') {
        // 如果响应是对象且有budgets字段，且budgets是数组
        if ('budgets' in response && Array.isArray(response.budgets)) {
          set({
            budgets: response.budgets,
            isLoading: false,
          });
          return;
        }

        // 如果响应是对象且有data字段，且data是数组
        if ('data' in response && Array.isArray(response.data)) {
          set({
            budgets: response.data,
            isLoading: false,
          });
          return;
        }
      }

      // 如果响应本身是数组
      if (Array.isArray(response)) {
        set({
          budgets: response,
          isLoading: false,
        });
        return;
      }

      // 默认设置为空数组
      set({
        budgets: [],
        isLoading: false,
      });
    } catch (error) {
      console.error('获取预算列表失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取预算列表失败',
      });
      toast.error('获取预算列表失败');
    }
  },

  // 获取活跃预算列表
  fetchActiveBudgets: async (accountBookId) => {
    try {
      set({ isLoading: true, error: null });

      let url = '/budgets/active';
      if (accountBookId) {
        url += `?accountBookId=${accountBookId}`;
      }

      console.log(`发送获取活跃预算请求: ${url}`);
      const response = await apiClient.get(url);
      console.log('获取活跃预算响应:', response);

      // 处理响应数据 - 更完善的数据提取逻辑
      let budgets = [];

      if (Array.isArray(response)) {
        budgets = response;
      } else if (response && typeof response === 'object') {
        // 检查常见的响应格式
        if ('data' in response && Array.isArray(response.data)) {
          budgets = response.data;
        } else if ('budgets' in response && Array.isArray(response.budgets)) {
          budgets = response.budgets;
        } else if ('items' in response && Array.isArray(response.items)) {
          budgets = response.items;
        }
      }

      console.log('处理后的预算数据:', budgets);

      set({
        budgets,
        isLoading: false,
      });
    } catch (error) {
      console.error('获取活跃预算失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取活跃预算失败',
      });
      toast.error('获取活跃预算失败');
    }
  },

  // 获取单个预算
  getBudget: async (id) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.get(`/budgets/${id}`);

      set({ isLoading: false });

      return response as Budget;
    } catch (error) {
      console.error(`获取预算 ${id} 失败:`, error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : `获取预算 ${id} 失败`,
      });
      toast.error(`获取预算详情失败`);
      return null;
    }
  },

  // 创建预算
  createBudget: async (data) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.post('/budgets', data);

      set({ isLoading: false });

      toast.success('预算创建成功');

      // 创建成功后，刷新预算列表
      const { refreshBudgets } = get();
      if (refreshBudgets) {
        await refreshBudgets();
      }

      return true;
    } catch (error) {
      console.error('创建预算失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '创建预算失败',
      });
      toast.error('创建预算失败');
      return false;
    }
  },

  // 更新预算
  updateBudget: async (id, data) => {
    try {
      set({ isLoading: true, error: null });

      await apiClient.put(`/budgets/${id}`, data);

      set({ isLoading: false });

      toast.success('预算更新成功');
      return true;
    } catch (error) {
      console.error(`更新预算 ${id} 失败:`, error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : `更新预算 ${id} 失败`,
      });
      toast.error('更新预算失败');
      return false;
    }
  },

  // 删除预算
  deleteBudget: async (id) => {
    try {
      set({ isLoading: true, error: null });

      await apiClient.delete(`/budgets/${id}`);

      set({ isLoading: false });

      toast.success('预算删除成功');
      return true;
    } catch (error) {
      console.error(`删除预算 ${id} 失败:`, error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : `删除预算 ${id} 失败`,
      });
      toast.error('删除预算失败');
      return false;
    }
  },

  // 刷新预算列表
  refreshBudgets: async () => {
    const { currentAccountBookId, fetchBudgets } = get();
    if (currentAccountBookId) {
      await fetchBudgets(currentAccountBookId);
    } else {
      await fetchBudgets();
    }
  },

  // 设置当前账本ID
  setCurrentAccountBookId: (accountBookId) => {
    set({ currentAccountBookId: accountBookId });
  },
}));
