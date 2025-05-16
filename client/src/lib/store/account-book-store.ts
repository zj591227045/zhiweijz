import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api/client';

// 账本类型
export type AccountBookType = 'PERSONAL' | 'FAMILY';

// 账本类型
export type AccountBook = {
  id: string;
  name: string;
  type: AccountBookType;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

// 账本状态类型
type AccountBookState = {
  accountBooks: AccountBook[];
  currentAccountBook: AccountBook | null;
  isLoading: boolean;
  error: string | null;
  
  // 获取所有账本
  fetchAccountBooks: () => Promise<void>;
  // 创建账本
  createAccountBook: (name: string, type: AccountBookType) => Promise<void>;
  // 更新账本
  updateAccountBook: (id: string, name: string) => Promise<void>;
  // 删除账本
  deleteAccountBook: (id: string) => Promise<void>;
  // 设置当前账本
  setCurrentAccountBook: (id: string) => void;
  // 设置默认账本
  setDefaultAccountBook: (id: string) => Promise<void>;
};

// 创建账本状态存储
export const useAccountBookStore = create<AccountBookState>()(
  persist(
    (set, get) => ({
      accountBooks: [],
      currentAccountBook: null,
      isLoading: false,
      error: null,
      
      // 获取所有账本
      fetchAccountBooks: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const accountBooks = await api.get<AccountBook[]>('/account-books');
          
          set({
            accountBooks,
            isLoading: false,
            // 如果没有当前账本或当前账本不在列表中，设置默认账本为当前账本
            currentAccountBook: get().currentAccountBook
              ? accountBooks.find(book => book.id === get().currentAccountBook?.id) || accountBooks.find(book => book.isDefault) || accountBooks[0] || null
              : accountBooks.find(book => book.isDefault) || accountBooks[0] || null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: '获取账本失败，请稍后再试',
          });
        }
      },
      
      // 创建账本
      createAccountBook: async (name: string, type: AccountBookType) => {
        set({ isLoading: true, error: null });
        
        try {
          const newAccountBook = await api.post<AccountBook>('/account-books', {
            name,
            type,
          });
          
          set(state => ({
            accountBooks: [...state.accountBooks, newAccountBook],
            isLoading: false,
          }));
        } catch (error) {
          set({
            isLoading: false,
            error: '创建账本失败，请稍后再试',
          });
          throw error;
        }
      },
      
      // 更新账本
      updateAccountBook: async (id: string, name: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const updatedAccountBook = await api.put<AccountBook>(`/account-books/${id}`, {
            name,
          });
          
          set(state => ({
            accountBooks: state.accountBooks.map(book =>
              book.id === id ? updatedAccountBook : book
            ),
            currentAccountBook:
              state.currentAccountBook?.id === id
                ? updatedAccountBook
                : state.currentAccountBook,
            isLoading: false,
          }));
        } catch (error) {
          set({
            isLoading: false,
            error: '更新账本失败，请稍后再试',
          });
          throw error;
        }
      },
      
      // 删除账本
      deleteAccountBook: async (id: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await api.delete(`/account-books/${id}`);
          
          const { accountBooks, currentAccountBook } = get();
          const updatedAccountBooks = accountBooks.filter(book => book.id !== id);
          
          set({
            accountBooks: updatedAccountBooks,
            // 如果删除的是当前账本，设置默认账本为当前账本
            currentAccountBook:
              currentAccountBook?.id === id
                ? updatedAccountBooks.find(book => book.isDefault) || updatedAccountBooks[0] || null
                : currentAccountBook,
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: '删除账本失败，请稍后再试',
          });
          throw error;
        }
      },
      
      // 设置当前账本
      setCurrentAccountBook: (id: string) => {
        const { accountBooks } = get();
        const accountBook = accountBooks.find(book => book.id === id);
        
        if (accountBook) {
          set({ currentAccountBook: accountBook });
        }
      },
      
      // 设置默认账本
      setDefaultAccountBook: async (id: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await api.put(`/account-books/${id}/default`);
          
          set(state => ({
            accountBooks: state.accountBooks.map(book => ({
              ...book,
              isDefault: book.id === id,
            })),
            isLoading: false,
          }));
        } catch (error) {
          set({
            isLoading: false,
            error: '设置默认账本失败，请稍后再试',
          });
          throw error;
        }
      },
    }),
    {
      name: 'account-book-storage',
      partialize: (state) => ({
        currentAccountBook: state.currentAccountBook,
      }),
    }
  )
);
