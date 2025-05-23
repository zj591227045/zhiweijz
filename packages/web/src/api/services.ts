import { 
  AuthService, 
  AccountBookService, 
  BudgetService, 
  CategoryBudgetService, 
  CategoryService, 
  TransactionService 
} from '@zhiweijz/core';
import { apiClient } from './api-client';
import { LocalStorageAdapter } from '../adapters/storage-adapter';

// 创建存储适配器
const storage = new LocalStorageAdapter();

// 是否为开发环境
const isDev = process.env.NODE_ENV === 'development';

// 创建服务实例
export const authService = new AuthService({
  apiClient,
  storage,
  onAuthStateChange: (isAuthenticated, user) => {
    if (isDev) {
      console.log('认证状态变化:', isAuthenticated, user);
    }
  }
});

export const accountBookService = new AccountBookService({
  apiClient,
  debug: isDev
});

export const budgetService = new BudgetService({
  apiClient,
  debug: isDev
});

export const categoryBudgetService = new CategoryBudgetService({
  apiClient,
  debug: isDev
});

export const categoryService = new CategoryService({
  apiClient,
  debug: isDev
});

export const transactionService = new TransactionService({
  apiClient
});
