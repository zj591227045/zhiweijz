'use client';

import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { CreateTransactionData, Transaction, TransactionType } from '@/types';

// 记账状态类型
interface TransactionState {
  // 数据状态
  transactions: Transaction[];
  transaction: Transaction | null; // 当前记账
  isLoading: boolean;
  error: string | null;

  // 操作方法
  fetchTransactions: (params?: {
    accountBookId?: string;
    startDate?: string;
    endDate?: string;
    type?: TransactionType;
    categoryIds?: string[];
    page?: number;
    limit?: number;
  }) => Promise<void>;

  fetchTransaction: (id: string) => Promise<void>; // 修改返回类型
  getTransaction: (id: string) => Promise<Transaction | null>;
  createTransaction: (data: CreateTransactionData) => Promise<Transaction | null>;
  updateTransaction: (id: string, data: Partial<CreateTransactionData>) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
}

// 创建记账状态管理
export const useTransactionStore = create<TransactionState>((set, get) => ({
  // 初始状态
  transactions: [],
  transaction: null,
  isLoading: false,
  error: null,

  // 获取记账列表
  fetchTransactions: async (params) => {
    try {
      set({ isLoading: true, error: null });

      // 添加附件信息参数
      const enhancedParams = {
        ...params,
        includeAttachments: true,
      };

      const response = await apiClient.get('/transactions', { params: enhancedParams });

      // 处理不同的响应格式
      if (response && typeof response === 'object') {
        // 如果响应是对象且有data字段，且data是数组
        if ('data' in response && Array.isArray(response.data)) {
          set({
            transactions: response.data,
            isLoading: false,
          });
          return;
        }
      }

      // 如果响应本身是数组
      if (Array.isArray(response)) {
        set({
          transactions: response,
          isLoading: false,
        });
        return;
      }

      // 默认设置为空数组
      set({
        transactions: [],
        isLoading: false,
      });
    } catch (error) {
      console.error('获取记账列表失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取记账列表失败',
      });
      toast.error('获取记账列表失败');
    }
  },

  // 获取单个记账并设置到状态中
  fetchTransaction: async (id) => {
    try {
      set({ isLoading: true, error: null, transaction: null });

      const response = await apiClient.get(`/transactions/${id}?includeAttachments=true`);

      // 处理不同的响应格式
      let transactionData: Transaction | null = null;

      if (response && typeof response === 'object') {
        // 如果响应有data字段，使用data
        if ('data' in response && response.data) {
          transactionData = response.data as Transaction;
        } else {
          // 否则直接使用响应本身
          transactionData = response as Transaction;
        }
      }

      set({
        isLoading: false,
        transaction: transactionData,
      });
    } catch (error) {
      console.error(`获取记账 ${id} 失败:`, error);
      set({
        isLoading: false,
        transaction: null,
        error: error instanceof Error ? error.message : `获取记账 ${id} 失败`,
      });
      toast.error(`获取记账详情失败`);
    }
  },

  // 获取单个记账
  getTransaction: async (id) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.get(`/transactions/${id}`);

      set({ isLoading: false });

      // 处理不同的响应格式
      if (response && typeof response === 'object') {
        // 如果响应有data字段，使用data
        if ('data' in response && response.data) {
          return response.data as Transaction;
        } else {
          // 否则直接使用响应本身
          return response as Transaction;
        }
      }

      return null;
    } catch (error) {
      console.error(`获取记账 ${id} 失败:`, error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : `获取记账 ${id} 失败`,
      });
      toast.error(`获取记账详情失败`);
      return null;
    }
  },

  // 创建记账
  createTransaction: async (data) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.post('/transactions', data);

      set({ isLoading: false });

      toast.success('记账创建成功');
      return response.data || response;
    } catch (error) {
      console.error('创建记账失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '创建记账失败',
      });
      toast.error('创建记账失败');
      return null;
    }
  },

  // 更新记账
  updateTransaction: async (id, data) => {
    try {
      set({ isLoading: true, error: null });

      await apiClient.put(`/transactions/${id}`, data);

      set({ isLoading: false });

      toast.success('记账更新成功');
      return true;
    } catch (error) {
      console.error(`更新记账 ${id} 失败:`, error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : `更新记账 ${id} 失败`,
      });
      toast.error('更新记账失败');
      return false;
    }
  },

  // 删除记账
  deleteTransaction: async (id) => {
    try {
      set({ isLoading: true, error: null });

      await apiClient.delete(`/transactions/${id}`);

      set({ isLoading: false });

      toast.success('记账删除成功');
      return true;
    } catch (error) {
      console.error(`删除记账 ${id} 失败:`, error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : `删除记账 ${id} 失败`,
      });
      toast.error('删除记账失败');
      return false;
    }
  },
}));
