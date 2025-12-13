/**
 * 账本状态管理 - React Query兼容层
 * 
 * 这是一个兼容层，将React Query包装成Zustand接口
 * 保持向后兼容的同时逐步迁移到React Query
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AccountBook, AccountBookType } from '@/types';
import { createLogger } from '@/lib/logger';

// 创建账本专用日志器
const accountBookLogger = createLogger('AccountBook');

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
  createAccountBook: (data: {
    name: string;
    description?: string;
    type?: AccountBookType;
  }) => Promise<boolean>;
  updateAccountBook: (
    id: string,
    data: { name?: string; description?: string },
  ) => Promise<boolean>;
  deleteAccountBook: (id: string) => Promise<boolean>;
  clearError: () => void;
}

/**
 * 兼容层：将React Query包装成Zustand接口
 * 
 * 注意：这是临时兼容层，新代码应该直接使用 useAccountBooks hook
 */
export const useAccountBookStore = create<AccountBookState>()(
  persist(
    (set, get) => ({
      // 初始状态
      accountBooks: [],
      currentAccountBook: null,
      isLoading: false,
      error: null,

      // 获取账本列表 - 兼容方法
      fetchAccountBooks: async () => {
        accountBookLogger.warn('使用了兼容层方法 fetchAccountBooks，建议迁移到 useAccountBooks hook');
        // TODO: 实现React Query调用
        set({ isLoading: true, error: null });
        // 暂时保持空实现，避免破坏现有功能
        set({ isLoading: false });
      },

      // 获取家庭账本列表 - 兼容方法
      fetchFamilyAccountBooks: async (familyId) => {
        accountBookLogger.warn('使用了兼容层方法 fetchFamilyAccountBooks，建议迁移到 useFamilyAccountBooks hook');
        // TODO: 实现React Query调用
      },

      // 设置当前账本 - 兼容方法
      setCurrentAccountBook: (accountBook) => {
        accountBookLogger.warn('使用了兼容层方法 setCurrentAccountBook，建议迁移到 useAccountBooks hook');
        if (typeof accountBook === 'string') {
          const { accountBooks } = get();
          const foundBook = accountBooks.find(book => book.id === accountBook);
          if (foundBook) {
            set({ currentAccountBook: foundBook });
          }
        } else {
          set({ currentAccountBook: accountBook });
        }
      },

      // 创建账本 - 兼容方法
      createAccountBook: async (data) => {
        accountBookLogger.warn('使用了兼容层方法 createAccountBook，建议迁移到 React Query mutation');
        // TODO: 实现React Query mutation
        return false;
      },

      // 更新账本 - 兼容方法
      updateAccountBook: async (id, data) => {
        accountBookLogger.warn('使用了兼容层方法 updateAccountBook，建议迁移到 React Query mutation');
        // TODO: 实现React Query mutation
        return false;
      },

      // 删除账本 - 兼容方法
      deleteAccountBook: async (id) => {
        accountBookLogger.warn('使用了兼容层方法 deleteAccountBook，建议迁移到 React Query mutation');
        // TODO: 实现React Query mutation
        return false;
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'account-book-storage',
      partialize: (state) => ({
        currentAccountBook: state.currentAccountBook,
      }),
    },
  ),
);