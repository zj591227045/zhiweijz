import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AccountBook, AccountBookType, CreateAccountBookData, UpdateAccountBookData } from "@/types";
import { apiClient } from "@/lib/api";

interface AccountBookState {
  accountBooks: AccountBook[];
  currentAccountBook: AccountBook | null;
  isLoading: boolean;
  error: string | null;
  fetchAccountBooks: () => Promise<void>;
  fetchFamilyAccountBooks: (familyId: string) => Promise<void>;
  setCurrentAccountBook: (accountBookId: string) => void;
  createAccountBook: (data: CreateAccountBookData) => Promise<void>;
  createFamilyAccountBook: (familyId: string, data: CreateAccountBookData) => Promise<void>;
  updateAccountBook: (id: string, data: UpdateAccountBookData) => Promise<void>;
  deleteAccountBook: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useAccountBookStore = create<AccountBookState>()(
  persist(
    (set, get) => ({
      accountBooks: [],
      currentAccountBook: null,
      isLoading: false,
      error: null,

      fetchAccountBooks: async () => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiClient.get<any>("/account-books");

          // 确保accountBooks是一个数组
          let accountBooks: AccountBook[] = [];

          // 处理不同的API响应格式
          if (Array.isArray(response)) {
            accountBooks = response;
          } else if (response && typeof response === 'object') {
            // 如果响应是一个对象，尝试获取data字段
            if (Array.isArray(response.data)) {
              accountBooks = response.data;
            } else if (response.books && Array.isArray(response.books)) {
              accountBooks = response.books;
            }
          }

          console.log("获取到的账本数据:", accountBooks);

          set({ accountBooks, isLoading: false });

          // 如果没有当前账本或当前账本不在列表中，获取默认账本
          const { currentAccountBook } = get();
          if (!currentAccountBook || !accountBooks.find(book => book.id === currentAccountBook.id)) {
            // 尝试从API获取默认账本
            try {
              const defaultBookResponse = await apiClient.get('/account-books/default');
              if (defaultBookResponse) {
                set({ currentAccountBook: defaultBookResponse });
              } else {
                // 如果API没有返回默认账本，使用第一个账本
                if (accountBooks.length > 0) {
                  set({ currentAccountBook: accountBooks[0] });
                }
              }
            } catch (error) {
              console.error('获取默认账本失败:', error);
              // 如果API调用失败，使用第一个账本
              if (accountBooks.length > 0) {
                set({ currentAccountBook: accountBooks[0] });
              }
            }
          }
        } catch (error: any) {
          console.error("获取账本失败:", error);
          set({
            isLoading: false,
            error: error.response?.data?.error?.message || "获取账本失败",
          });
        }
      },

      fetchFamilyAccountBooks: async (familyId: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiClient.get<any>(`/account-books/family/${familyId}`);

          // 确保accountBooks是一个数组
          let accountBooks: AccountBook[] = [];

          // 处理不同的API响应格式
          if (Array.isArray(response)) {
            accountBooks = response;
          } else if (response && typeof response === 'object') {
            // 如果响应是一个对象，尝试获取data字段
            if (Array.isArray(response.data)) {
              accountBooks = response.data;
            } else if (response.books && Array.isArray(response.books)) {
              accountBooks = response.books;
            }
          }

          console.log("获取到的家庭账本数据:", accountBooks);

          // 合并账本列表，保留现有的个人账本
          const { accountBooks: existingBooks } = get();
          const personalBooks = existingBooks.filter(book => book.type === AccountBookType.PERSONAL);
          const mergedBooks = [...personalBooks, ...accountBooks];

          set({ accountBooks: mergedBooks, isLoading: false });
        } catch (error: any) {
          console.error("获取家庭账本失败:", error);
          set({
            isLoading: false,
            error: error.response?.data?.error?.message || "获取家庭账本失败",
          });
        }
      },

      setCurrentAccountBook: (accountBookId: string) => {
        const { accountBooks } = get();
        const accountBook = accountBooks.find(book => book.id === accountBookId);
        if (accountBook) {
          set({ currentAccountBook: accountBook });
        }
      },

      createAccountBook: async (data: CreateAccountBookData) => {
        try {
          set({ isLoading: true, error: null });
          const newAccountBook = await apiClient.post<AccountBook>("/account-books", data);

          const { accountBooks } = get();
          set({
            accountBooks: [...accountBooks, newAccountBook],
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.error?.message || "创建账本失败",
          });
        }
      },

      createFamilyAccountBook: async (familyId: string, data: CreateAccountBookData) => {
        try {
          set({ isLoading: true, error: null });
          const newAccountBook = await apiClient.post<AccountBook>(`/account-books/family/${familyId}`, data);

          const { accountBooks } = get();
          set({
            accountBooks: [...accountBooks, newAccountBook],
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.error?.message || "创建家庭账本失败",
          });
        }
      },

      updateAccountBook: async (id: string, data: UpdateAccountBookData) => {
        try {
          set({ isLoading: true, error: null });
          const updatedAccountBook = await apiClient.put<AccountBook>(`/account-books/${id}`, data);

          const { accountBooks, currentAccountBook } = get();
          set({
            accountBooks: accountBooks.map(book =>
              book.id === id ? updatedAccountBook : book
            ),
            currentAccountBook: currentAccountBook?.id === id ? updatedAccountBook : currentAccountBook,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.error?.message || "更新账本失败",
          });
        }
      },

      deleteAccountBook: async (id: string) => {
        try {
          set({ isLoading: true, error: null });
          await apiClient.delete(`/account-books/${id}`);

          const { accountBooks, currentAccountBook } = get();
          const newAccountBooks = accountBooks.filter(book => book.id !== id);

          set({
            accountBooks: newAccountBooks,
            isLoading: false,
          });

          // 如果删除的是当前账本，切换到默认账本
          if (currentAccountBook?.id === id) {
            const defaultBook = newAccountBooks.find(book => book.isDefault) || newAccountBooks[0];
            if (defaultBook) {
              set({ currentAccountBook: defaultBook });
            } else {
              set({ currentAccountBook: null });
            }
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.error?.message || "删除账本失败",
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "account-book-storage",
      partialize: (state) => ({
        currentAccountBook: state.currentAccountBook,
      }),
    }
  )
);
