'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/api/api-client';
import { toast } from 'sonner';
import { AccountBook, AccountBookType } from '@/types';

// 账本类型定义已从 @/types 导入

// 账本状态类型
interface AccountBookState {
  // 状态
  accountBooks: AccountBook[];
  currentAccountBook: AccountBook | null;
  isLoading: boolean;
  error: string | null;

  // 操作方法
  fetchAccountBooks: () => Promise<void>;
  fetchFamilyAccountBooks: (familyId: string) => Promise<void>;
  setCurrentAccountBook: (accountBook: AccountBook | string) => void;
  createAccountBook: (data: { name: string; description?: string; type?: AccountBookType }) => Promise<boolean>;
  updateAccountBook: (id: string, data: { name?: string; description?: string }) => Promise<boolean>;
  deleteAccountBook: (id: string) => Promise<boolean>;
  clearError: () => void;
}

// 创建账本状态管理
export const useAccountBookStore = create<AccountBookState>()(
  persist(
    (set, get) => ({
  // 初始状态
  accountBooks: [],
  currentAccountBook: null,
  isLoading: false,
  error: null,

  // 获取账本列表
  fetchAccountBooks: async () => {
    try {
      set({ isLoading: true, error: null });
      console.log('📚 [AccountBookStore] 开始获取账本列表...');

      const response = await apiClient.get('/account-books');
      console.log('📚 [AccountBookStore] 账本API响应:', {
        status: response.status,
        data: response.data,
        dataType: typeof response.data,
        isObject: response.data && typeof response.data === 'object',
        hasDataProperty: response.data && typeof response.data === 'object' && 'data' in response.data,
        dataPropertyIsArray: response.data && typeof response.data === 'object' && Array.isArray(response.data.data),
        isDirectArray: Array.isArray(response.data)
      });

      // 处理后端分页响应格式
      let accountBooks: AccountBook[] = [];
      if (response.data && typeof response.data === 'object') {
        // 如果响应是分页格式 {data: [...], total: number, ...}
        if (Array.isArray(response.data.data)) {
          accountBooks = response.data.data;
          console.log('📚 [AccountBookStore] 使用分页格式，账本数量:', accountBooks.length);
          console.log('📚 [AccountBookStore] 分页信息:', {
            total: response.data.total,
            page: response.data.page,
            limit: response.data.limit
          });
        }
        // 如果响应直接是数组（兼容旧格式）
        else if (Array.isArray(response.data)) {
          accountBooks = response.data;
          console.log('📚 [AccountBookStore] 使用数组格式，账本数量:', accountBooks.length);
        } else {
          console.warn('📚 [AccountBookStore] 未知的响应格式:', response.data);
        }
      } else {
        console.warn('📚 [AccountBookStore] 响应数据不是对象:', response.data);
      }

      console.log('📚 [AccountBookStore] 处理后的账本列表:', accountBooks);

      // 设置默认账本为当前账本（只在没有当前账本时设置）
      const currentState = get();
      const defaultAccountBook = accountBooks.find((book: AccountBook) => book.isDefault) || accountBooks[0];
      console.log('📚 [AccountBookStore] 默认账本:', defaultAccountBook);
      console.log('📚 [AccountBookStore] 当前账本状态:', currentState.currentAccountBook);

      const newState = {
        accountBooks,
        currentAccountBook: currentState.currentAccountBook || defaultAccountBook || null,
        isLoading: false,
        error: null
      };

      console.log('📚 [AccountBookStore] 即将设置的新状态:', newState);
      set(newState);

      console.log('📚 [AccountBookStore] 账本状态更新完成');

      // 验证状态是否正确设置
      const finalState = get();
      console.log('📚 [AccountBookStore] 最终状态验证:', {
        accountBooksCount: finalState.accountBooks.length,
        currentAccountBook: finalState.currentAccountBook,
        isLoading: finalState.isLoading,
        error: finalState.error
      });

    } catch (error: any) {
      console.error('📚 [AccountBookStore] 获取账本列表失败:', {
        error,
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      const errorMessage = error.response?.data?.message || '获取账本列表失败';
      set({
        isLoading: false,
        error: errorMessage
      });
      toast.error(errorMessage);
    }
  },

  // 获取家庭账本列表
  fetchFamilyAccountBooks: async (familyId) => {
    try {
      set({ isLoading: true, error: null });
      console.log('📚 [AccountBookStore] 开始获取家庭账本列表...', familyId);

      const response = await apiClient.get(`/account-books/family/${familyId}`);
      console.log('📚 [AccountBookStore] 家庭账本API响应:', response.data);

      // 处理后端响应格式
      let familyAccountBooks: AccountBook[] = [];
      if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data.data)) {
          familyAccountBooks = response.data.data;
        } else if (Array.isArray(response.data)) {
          familyAccountBooks = response.data;
        }
      }

      // 合并账本列表，保留现有的个人账本
      const { accountBooks: existingBooks } = get();
      const personalBooks = existingBooks.filter(book => book.type === AccountBookType.PERSONAL);
      const mergedBooks = [...personalBooks, ...familyAccountBooks];

      set({ 
        accountBooks: mergedBooks, 
        isLoading: false,
        error: null 
      });

      console.log('📚 [AccountBookStore] 家庭账本状态更新完成');

    } catch (error: any) {
      console.error('📚 [AccountBookStore] 获取家庭账本列表失败:', error);
      const errorMessage = error.response?.data?.message || '获取家庭账本列表失败';
      set({
        isLoading: false,
        error: errorMessage
      });
      toast.error(errorMessage);
    }
  },

  // 设置当前账本
  setCurrentAccountBook: (accountBook) => {
    if (typeof accountBook === 'string') {
      // 如果传入的是账本ID，从列表中查找对应的账本
      const { accountBooks } = get();
      const foundBook = accountBooks.find(book => book.id === accountBook);
      if (foundBook) {
        console.log('📚 [AccountBookStore] 切换账本:', foundBook.name);
        set({ currentAccountBook: foundBook });
      } else {
        console.warn('📚 [AccountBookStore] 未找到账本ID:', accountBook);
      }
    } else {
      // 如果传入的是账本对象，直接设置
      console.log('📚 [AccountBookStore] 切换账本:', accountBook.name);
      set({ currentAccountBook: accountBook });
    }
  },

  // 创建账本
  createAccountBook: async (data) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.post('/account-books', data);
      const newAccountBook = response.data;

      set((state) => ({
        accountBooks: [...state.accountBooks, newAccountBook],
        isLoading: false,
        error: null
      }));

      toast.success('账本创建成功');
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '创建账本失败';
      set({
        isLoading: false,
        error: errorMessage
      });
      toast.error(errorMessage);
      return false;
    }
  },

  // 更新账本
  updateAccountBook: async (id, data) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.put(`/account-books/${id}`, data);
      const updatedAccountBook = response.data;

      set((state) => ({
        accountBooks: state.accountBooks.map(book =>
          book.id === id ? updatedAccountBook : book
        ),
        currentAccountBook: state.currentAccountBook?.id === id
          ? updatedAccountBook
          : state.currentAccountBook,
        isLoading: false,
        error: null
      }));

      toast.success('账本更新成功');
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '更新账本失败';
      set({
        isLoading: false,
        error: errorMessage
      });
      toast.error(errorMessage);
      return false;
    }
  },

  // 删除账本
  deleteAccountBook: async (id) => {
    try {
      set({ isLoading: true, error: null });

      await apiClient.delete(`/account-books/${id}`);

      set((state) => ({
        accountBooks: state.accountBooks.filter(book => book.id !== id),
        currentAccountBook: state.currentAccountBook?.id === id
          ? null
          : state.currentAccountBook,
        isLoading: false,
        error: null
      }));

      toast.success('账本删除成功');
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '删除账本失败';
      set({
        isLoading: false,
        error: errorMessage
      });
      toast.error(errorMessage);
      return false;
    }
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  }
}),
{
  name: 'account-book-storage',
  partialize: (state) => ({
    currentAccountBook: state.currentAccountBook,
  }),
}
)
);
