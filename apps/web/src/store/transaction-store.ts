'use client';

import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { CreateTransactionData, Transaction, TransactionType } from '@/types';

// 交易状态类型
interface TransactionState {
  // 数据状态
  transactions: Transaction[];
  transaction: Transaction | null; // 当前交易
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

// 创建交易状态管理
export const useTransactionStore = create<TransactionState>((set, get) => ({
  // 初始状态
  transactions: [],
  transaction: null,
  isLoading: false,
  error: null,

  // 获取交易列表
  fetchTransactions: async (params) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.get('/transactions', { params });

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
      console.error('获取交易列表失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取交易列表失败',
      });
      toast.error('获取交易列表失败');
    }
  },

  // 获取单个交易并设置到状态中
  fetchTransaction: async (id) => {
    try {
      set({ isLoading: true, error: null, transaction: null });

      const response = await apiClient.get(`/transactions/${id}`);

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
      console.error(`获取交易 ${id} 失败:`, error);
      set({
        isLoading: false,
        transaction: null,
        error: error instanceof Error ? error.message : `获取交易 ${id} 失败`,
      });
      toast.error(`获取交易详情失败`);
    }
  },

  // 获取单个交易
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
      console.error(`获取交易 ${id} 失败:`, error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : `获取交易 ${id} 失败`,
      });
      toast.error(`获取交易详情失败`);
      return null;
    }
  },

  // 创建交易
  createTransaction: async (data) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.post('/transactions', data);

      set({ isLoading: false });

      toast.success('交易创建成功');
      return response.data || response;
    } catch (error) {
      console.error('创建交易失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '创建交易失败',
      });
      toast.error('创建交易失败');
      return null;
    }
  },

  // 更新交易
  updateTransaction: async (id, data) => {
    try {
      set({ isLoading: true, error: null });

      await apiClient.put(`/transactions/${id}`, data);

      set({ isLoading: false });

      toast.success('交易更新成功');
      return true;
    } catch (error) {
      console.error(`更新交易 ${id} 失败:`, error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : `更新交易 ${id} 失败`,
      });
      toast.error('更新交易失败');
      return false;
    }
  },

  // 删除交易
  deleteTransaction: async (id) => {
    try {
      set({ isLoading: true, error: null });

      await apiClient.delete(`/transactions/${id}`);

      set({ isLoading: false });

      toast.success('交易删除成功');
      return true;
    } catch (error) {
      console.error(`删除交易 ${id} 失败:`, error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : `删除交易 ${id} 失败`,
      });
      toast.error('删除交易失败');
      return false;
    }
  },
}));
