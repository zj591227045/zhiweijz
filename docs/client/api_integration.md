# 只为记账 - 前端API集成

本文档详细描述了"只为记账"应用前端与后端API的集成方式，包括API客户端设置、数据获取、错误处理和缓存策略。

## 1. API客户端设置

### 1.1 基础设置

我们使用Axios作为HTTP客户端，并结合React Query进行数据获取和缓存。

```typescript
// /client/src/lib/api-client.ts
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { toast } from '@/components/ui/use-toast';

// 创建API客户端实例
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 从本地存储获取令牌
    const token = localStorage.getItem('auth-token');

    // 如果存在令牌，添加到请求头
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // 处理常见错误
    if (error.response) {
      const status = error.response.status;

      // 处理401未授权错误
      if (status === 401) {
        // 清除本地存储的令牌
        localStorage.removeItem('auth-token');

        // 如果不是登录页面，重定向到登录页
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }

      // 处理500服务器错误
      if (status >= 500) {
        toast({
          title: '服务器错误',
          description: '服务器暂时不可用，请稍后再试',
          variant: 'destructive',
        });
      }
    } else if (error.request) {
      // 请求已发送但未收到响应
      toast({
        title: '网络错误',
        description: '无法连接到服务器，请检查您的网络连接',
        variant: 'destructive',
      });
    } else {
      // 请求设置时出错
      toast({
        title: '请求错误',
        description: error.message || '发送请求时出错',
        variant: 'destructive',
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### 1.2 API服务

创建API服务封装所有API调用：

```typescript
// /client/src/lib/api.ts
import apiClient from './api-client';
import { User, Transaction, Category, Budget, AccountBook, Family } from '@/types/models';

// API响应类型
interface ApiResponse<T> {
  data: T;
  message?: string;
}

// 分页响应类型
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API服务
export const api = {
  // 认证API
  auth: {
    // 用户注册
    register: async (data: { email: string; password: string; name: string }) => {
      const response = await apiClient.post<ApiResponse<{ user: User; token: string }>>('/auth/register', data);
      return response.data.data;
    },

    // 用户登录
    login: async (data: { email: string; password: string }) => {
      const response = await apiClient.post<ApiResponse<{ user: User; token: string }>>('/auth/login', data);
      return response.data.data;
    },

    // 请求密码重置
    forgotPassword: async (data: { email: string }) => {
      const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/forgot-password', data);
      return response.data.data;
    },

    // 重置密码
    resetPassword: async (data: { token: string; password: string }) => {
      const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/reset-password', data);
      return response.data.data;
    },
  },

  // 用户API
  users: {
    // 获取当前用户信息
    getCurrentUser: async () => {
      const response = await apiClient.get<ApiResponse<User>>('/users/me');
      return response.data.data;
    },

    // 更新用户信息
    updateUser: async (data: Partial<User>) => {
      const response = await apiClient.patch<ApiResponse<User>>('/users/me', data);
      return response.data.data;
    },
  },

  // 交易API
  transactions: {
    // 获取交易列表
    getTransactions: async (params?: {
      page?: number;
      limit?: number;
      type?: 'INCOME' | 'EXPENSE';
      categoryId?: string;
      startDate?: string;
      endDate?: string;
      accountBookId?: string;
    }) => {
      const response = await apiClient.get<PaginatedResponse<Transaction>>('/transactions', { params });
      return response.data;
    },

    // 获取单个交易
    getTransaction: async (id: string) => {
      const response = await apiClient.get<ApiResponse<Transaction>>(`/transactions/${id}`);
      return response.data.data;
    },

    // 创建交易
    createTransaction: async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiClient.post<ApiResponse<Transaction>>('/transactions', data);
      return response.data.data;
    },

    // 更新交易
    updateTransaction: async (id: string, data: Partial<Transaction>) => {
      const response = await apiClient.patch<ApiResponse<Transaction>>(`/transactions/${id}`, data);
      return response.data.data;
    },

    // 删除交易
    deleteTransaction: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/transactions/${id}`);
      return response.data.data;
    },
  },

  // 分类API
  categories: {
    // 获取分类列表
    getCategories: async (params?: { type?: 'INCOME' | 'EXPENSE' }) => {
      const response = await apiClient.get<ApiResponse<Category[]>>('/categories', { params });
      return response.data.data;
    },

    // 创建分类
    createCategory: async (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiClient.post<ApiResponse<Category>>('/categories', data);
      return response.data.data;
    },

    // 更新分类
    updateCategory: async (id: string, data: Partial<Category>) => {
      const response = await apiClient.patch<ApiResponse<Category>>(`/categories/${id}`, data);
      return response.data.data;
    },

    // 删除分类
    deleteCategory: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/categories/${id}`);
      return response.data.data;
    },
  },

  // 预算API
  budgets: {
    // 获取预算列表
    getBudgets: async (params?: { month?: string; accountBookId?: string }) => {
      const response = await apiClient.get<ApiResponse<Budget[]>>('/budgets', { params });
      return response.data.data;
    },

    // 创建预算
    createBudget: async (data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiClient.post<ApiResponse<Budget>>('/budgets', data);
      return response.data.data;
    },

    // 更新预算
    updateBudget: async (id: string, data: Partial<Budget>) => {
      const response = await apiClient.patch<ApiResponse<Budget>>(`/budgets/${id}`, data);
      return response.data.data;
    },

    // 删除预算
    deleteBudget: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/budgets/${id}`);
      return response.data.data;
    },
  },

  // 账本API
  accountBooks: {
    // 获取账本列表
    getAccountBooks: async () => {
      const response = await apiClient.get<ApiResponse<AccountBook[]>>('/account-books');
      return response.data.data;
    },

    // 获取默认账本
    getDefaultAccountBook: async () => {
      const response = await apiClient.get<ApiResponse<AccountBook>>('/account-books/default');
      return response.data.data;
    },

    // 创建账本
    createAccountBook: async (data: Omit<AccountBook, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiClient.post<ApiResponse<AccountBook>>('/account-books', data);
      return response.data.data;
    },

    // 更新账本
    updateAccountBook: async (id: string, data: Partial<AccountBook>) => {
      const response = await apiClient.patch<ApiResponse<AccountBook>>(`/account-books/${id}`, data);
      return response.data.data;
    },

    // 删除账本
    deleteAccountBook: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/account-books/${id}`);
      return response.data.data;
    },
  },

  // 统计API
  statistics: {
    // 获取财务概览
    getFinancialOverview: async (month: string) => {
      const response = await apiClient.get<ApiResponse<{
        income: number;
        expense: number;
        balance: number;
      }>>('/statistics/overview', { params: { month } });
      return response.data.data;
    },

    // 获取支出统计
    getExpenseStatistics: async (params: { startDate: string; endDate: string; accountBookId?: string }) => {
      const response = await apiClient.get<ApiResponse<{
        byCategory: { categoryId: string; categoryName: string; amount: number; percentage: number }[];
        byDay: { date: string; amount: number }[];
      }>>('/statistics/expenses', { params });
      return response.data.data;
    },

    // 获取收入统计
    getIncomeStatistics: async (params: { startDate: string; endDate: string; accountBookId?: string }) => {
      const response = await apiClient.get<ApiResponse<{
        byCategory: { categoryId: string; categoryName: string; amount: number; percentage: number }[];
        byDay: { date: string; amount: number }[];
      }>>('/statistics/income', { params });
      return response.data.data;
    },

    // 获取预算执行情况
    getBudgetProgress: async (month: string, accountBookId?: string) => {
      const response = await apiClient.get<ApiResponse<{
        id: string;
        categoryId: string;
        categoryName: string;
        amount: number;
        spent: number;
        percentage: number;
      }[]>>('/statistics/budgets', { params: { month, accountBookId } });
      return response.data.data;
    },
  },
};
```

## 2. React Query集成

### 2.1 查询钩子

使用React Query创建自定义钩子，简化数据获取：

```typescript
// /client/src/hooks/use-transactions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Transaction } from '@/types/models';

// 获取交易列表
export function useTransactions(params?: {
  page?: number;
  limit?: number;
  type?: 'INCOME' | 'EXPENSE';
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  accountBookId?: string;
}) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => api.transactions.getTransactions(params),
  });
}

// 获取单个交易
export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => api.transactions.getTransaction(id),
    enabled: !!id,
  });
}

// 创建交易
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) =>
      api.transactions.createTransaction(data),
    onSuccess: () => {
      // 创建成功后，使交易列表查询失效，触发重新获取
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      // 同时使财务概览和预算进度查询失效
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

// 更新交易
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Transaction> }) =>
      api.transactions.updateTransaction(id, data),
    onSuccess: (data, variables) => {
      // 更新成功后，更新缓存中的交易数据
      queryClient.setQueryData(['transaction', variables.id], data);
      // 同时使交易列表查询失效
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      // 同时使财务概览和预算进度查询失效
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

// 删除交易
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.transactions.deleteTransaction(id),
    onSuccess: (_, id) => {
      // 删除成功后，从缓存中移除交易数据
      queryClient.removeQueries({ queryKey: ['transaction', id] });
      // 同时使交易列表查询失效
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      // 同时使财务概览和预算进度查询失效
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}
```

### 2.2 无限滚动查询

实现交易列表的无限滚动加载：

```typescript
// /client/src/hooks/use-infinite-transactions.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useInfiniteTransactions(params?: {
  limit?: number;
  type?: 'INCOME' | 'EXPENSE';
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  accountBookId?: string;
}) {
  const limit = params?.limit || 20;

  return useInfiniteQuery({
    queryKey: ['infinite-transactions', params],
    queryFn: ({ pageParam = 1 }) =>
      api.transactions.getTransactions({ ...params, page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // 如果当前页小于总页数，返回下一页的页码
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      // 否则返回undefined，表示没有更多页
      return undefined;
    },
  });
}
```

## 3. 认证状态管理

### 3.1 认证存储

使用Zustand管理认证状态：

```typescript
// /client/src/store/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/models';
import { api } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { user, token } = await api.auth.login({ email, password });
          // 保存令牌到本地存储
          localStorage.setItem('auth-token', token);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true });
        try {
          const { user, token } = await api.auth.register({ email, password, name });
          // 保存令牌到本地存储
          localStorage.setItem('auth-token', token);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        // 清除本地存储的令牌
        localStorage.removeItem('auth-token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      loadUser: async () => {
        const token = localStorage.getItem('auth-token');
        if (!token) {
          set({ user: null, token: null, isAuthenticated: false });
          return;
        }

        set({ isLoading: true, token });
        try {
          const user = await api.users.getCurrentUser();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          // 如果获取用户信息失败，清除令牌和认证状态
          localStorage.removeItem('auth-token');
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      // 只持久化令牌，不持久化用户信息
      partialize: (state) => ({ token: state.token }),
    }
  )
);
```

### 3.2 认证钩子

创建认证钩子，简化认证状态的使用：

```typescript
// hooks/use-auth.ts
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export function useAuth(requireAuth = true) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, loadUser, logout } = useAuthStore();

  useEffect(() => {
    // 如果用户未加载，尝试加载用户
    if (!isAuthenticated && !isLoading) {
      loadUser();
    }
  }, [isAuthenticated, isLoading, loadUser]);

  useEffect(() => {
    // 如果需要认证但用户未认证且不在加载中，重定向到登录页
    if (requireAuth && !isAuthenticated && !isLoading) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }

    // 如果不需要认证但用户已认证，重定向到仪表盘
    if (!requireAuth && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [requireAuth, isAuthenticated, isLoading, router, pathname]);

  return { user, isAuthenticated, isLoading, logout };
}
```

## 4. 缓存策略

### 4.1 React Query配置

配置React Query的全局缓存策略：

```typescript
// app/providers.tsx
'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 默认缓存时间为5分钟
        staleTime: 5 * 60 * 1000,
        // 默认重试次数为1
        retry: 1,
        // 默认重试延迟为1秒
        retryDelay: 1000,
        // 默认刷新间隔为5分钟
        refetchInterval: 5 * 60 * 1000,
        // 窗口聚焦时刷新
        refetchOnWindowFocus: true,
        // 网络恢复时刷新
        refetchOnReconnect: true,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 4.2 自定义缓存策略

为不同类型的数据设置不同的缓存策略：

```typescript
// 分类数据缓存较长时间，因为变化不频繁
export function useCategories(type?: 'INCOME' | 'EXPENSE') {
  return useQuery({
    queryKey: ['categories', type],
    queryFn: () => api.categories.getCategories({ type }),
    // 缓存1小时
    staleTime: 60 * 60 * 1000,
  });
}

// 交易数据缓存较短时间，因为可能频繁变化
export function useRecentTransactions(limit = 10) {
  return useQuery({
    queryKey: ['recent-transactions', limit],
    queryFn: () => api.transactions.getTransactions({ limit }),
    // 缓存2分钟
    staleTime: 2 * 60 * 1000,
  });
}

// 统计数据可能需要实时更新
export function useFinancialOverview(month: string) {
  return useQuery({
    queryKey: ['overview', month],
    queryFn: () => api.statistics.getFinancialOverview(month),
    // 缓存1分钟
    staleTime: 60 * 1000,
    // 每分钟自动刷新
    refetchInterval: 60 * 1000,
  });
}
```
