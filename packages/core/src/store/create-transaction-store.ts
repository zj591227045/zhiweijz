import { create } from 'zustand';
import { StorageAdapter } from '../adapters/storage-adapter';

// 交易类型枚举
export enum TransactionType {
  EXPENSE = "EXPENSE",
  INCOME = "INCOME",
}

// 交易接口
export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
  accountBookId: string;
  accountBook?: {
    id: string;
    name: string;
  };
  budgetId?: string;
  budget?: {
    id: string;
    name: string;
  };
  description?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// 创建交易数据接口
export interface CreateTransactionData {
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountBookId: string;
  budgetId?: string;
  description?: string;
  date: string;
}

// 更新交易数据接口
export interface UpdateTransactionData {
  amount?: number;
  type?: TransactionType;
  categoryId?: string;
  budgetId?: string;
  description?: string;
  date?: string;
}

// 交易状态接口
export interface TransactionState {
  transactions: Transaction[];
  transaction: Transaction | null;
  isLoading: boolean;
  error: string | null;
  
  fetchTransactions: (params?: any) => Promise<void>;
  fetchTransaction: (id: string) => Promise<void>;
  createTransaction: (data: CreateTransactionData) => Promise<boolean>;
  updateTransaction: (id: string, data: UpdateTransactionData) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
  clearError: () => void;
}

// 交易store选项接口
export interface TransactionStoreOptions {
  apiClient: any;
  storage: StorageAdapter;
  onCreateSuccess?: (transaction: Transaction) => void;
  onCreateError?: (error: string) => void;
  onUpdateSuccess?: (transaction: Transaction) => void;
  onUpdateError?: (error: string) => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: string) => void;
}

export const createTransactionStore = (options: TransactionStoreOptions) => {
  const { 
    apiClient, 
    storage, 
    onCreateSuccess, 
    onCreateError,
    onUpdateSuccess,
    onUpdateError,
    onDeleteSuccess,
    onDeleteError
  } = options;

  return create<TransactionState>((set, get) => ({
    transactions: [],
    transaction: null,
    isLoading: false,
    error: null,

    // 获取交易列表
    fetchTransactions: async (params = {}) => {
      try {
        set({ isLoading: true, error: null });
        
        const response = await apiClient.get('/transactions', { params });
        
        // 处理不同的响应格式
        let transactions = [];
        if (response && typeof response === 'object') {
          if ('data' in response && Array.isArray(response.data)) {
            transactions = response.data;
          } else if (Array.isArray(response)) {
            transactions = response;
          }
        }
        
        set({
          transactions,
          isLoading: false
        });
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '获取交易列表失败';
        set({
          isLoading: false,
          error: errorMessage,
        });
      }
    },

    // 获取单个交易
    fetchTransaction: async (id: string) => {
      try {
        set({ isLoading: true, error: null });
        
        const response = await apiClient.get(`/transactions/${id}`);
        
        // 处理响应格式
        let transaction = null;
        if (response && typeof response === 'object') {
          if ('data' in response) {
            transaction = response.data;
          } else {
            transaction = response;
          }
        }
        
        set({
          transaction,
          isLoading: false
        });
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '获取交易详情失败';
        set({
          isLoading: false,
          error: errorMessage,
        });
      }
    },

    // 创建交易
    createTransaction: async (data: CreateTransactionData) => {
      try {
        set({ isLoading: true, error: null });
        
        const response = await apiClient.post('/transactions', data);
        
        set({ isLoading: false });
        
        // 创建成功回调
        if (onCreateSuccess && response) {
          let transaction = response;
          if (response && typeof response === 'object' && 'data' in response) {
            transaction = response.data;
          }
          onCreateSuccess(transaction);
        }
        
        return true;
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '创建交易失败';
        set({
          isLoading: false,
          error: errorMessage,
        });
        
        // 创建失败回调
        if (onCreateError) {
          onCreateError(errorMessage);
        }
        
        return false;
      }
    },

    // 更新交易
    updateTransaction: async (id: string, data: UpdateTransactionData) => {
      try {
        set({ isLoading: true, error: null });
        
        const response = await apiClient.put(`/transactions/${id}`, data);
        
        set({ isLoading: false });
        
        // 更新成功回调
        if (onUpdateSuccess && response) {
          let transaction = response;
          if (response && typeof response === 'object' && 'data' in response) {
            transaction = response.data;
          }
          onUpdateSuccess(transaction);
        }
        
        return true;
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '更新交易失败';
        set({
          isLoading: false,
          error: errorMessage,
        });
        
        // 更新失败回调
        if (onUpdateError) {
          onUpdateError(errorMessage);
        }
        
        return false;
      }
    },

    // 删除交易
    deleteTransaction: async (id: string) => {
      try {
        set({ isLoading: true, error: null });
        
        await apiClient.delete(`/transactions/${id}`);
        
        set({ isLoading: false });
        
        // 删除成功回调
        if (onDeleteSuccess) {
          onDeleteSuccess();
        }
        
        return true;
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '删除交易失败';
        set({
          isLoading: false,
          error: errorMessage,
        });
        
        // 删除失败回调
        if (onDeleteError) {
          onDeleteError(errorMessage);
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
