import { create } from 'zustand';
import { useAdminAuth } from './useAdminAuth';

interface OverviewStats {
  totalUsers: number;
  totalTransactions: number;
  todayUsers: number;
  todayTransactions: number;
  totalAccountBooks: number;
  activeFamilies: number;
}

interface UserStats {
  period: string;
  days: number;
  dailyRegistrations: Array<{
    date: string;
    count: number;
  }>;
  activeUsers: number;
}

interface TransactionStats {
  period: string;
  days: number;
  dailyTransactions: Array<{
    date: string;
    count: number;
    expenseAmount: number;
    incomeAmount: number;
  }>;
  categoryStats: Array<{
    name: string;
    transactionCount: number;
    totalAmount: number;
  }>;
}

interface SystemResources {
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
    process: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
  };
  cpu: {
    count: number;
    model: string;
    loadAverage: {
      '1min': number;
      '5min': number;
      '15min': number;
    };
  };
  uptime: {
    system: number;
    process: number;
  };
  platform: string;
  nodeVersion: string;
}

interface AdminDashboardState {
  overview: OverviewStats | null;
  userStats: UserStats | null;
  transactionStats: TransactionStats | null;
  systemResources: SystemResources | null;
  isLoading: {
    overview: boolean;
    userStats: boolean;
    transactionStats: boolean;
    systemResources: boolean;
  };
  error: string | null;

  // Actions
  fetchOverview: () => Promise<void>;
  fetchUserStats: (period: string) => Promise<void>;
  fetchTransactionStats: (period: string) => Promise<void>;
  fetchSystemResources: () => Promise<void>;
  clearError: () => void;
}

export const useAdminDashboard = create<AdminDashboardState>((set, get) => ({
  overview: null,
  userStats: null,
  transactionStats: null,
  systemResources: null,
  isLoading: {
    overview: false,
    userStats: false,
    transactionStats: false,
    systemResources: false,
  },
  error: null,

  fetchOverview: async () => {
    const token = useAdminAuth.getState().token;
    if (!token) {
      set({ error: '未认证' });
      return;
    }

    set(state => ({
      isLoading: { ...state.isLoading, overview: true },
      error: null,
    }));

    try {
      const response = await fetch('/api/admin/dashboard/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || '获取概览数据失败');
      }

      set(state => ({
        overview: data.data,
        isLoading: { ...state.isLoading, overview: false },
        error: null,
      }));
    } catch (error) {
      set(state => ({
        isLoading: { ...state.isLoading, overview: false },
        error: error instanceof Error ? error.message : '获取概览数据失败',
      }));
    }
  },

  fetchUserStats: async (period: string) => {
    const token = useAdminAuth.getState().token;
    if (!token) {
      set({ error: '未认证' });
      return;
    }

    set(state => ({
      isLoading: { ...state.isLoading, userStats: true },
      error: null,
    }));

    try {
      const response = await fetch(`/api/admin/dashboard/users?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || '获取用户统计失败');
      }

      set(state => ({
        userStats: data.data,
        isLoading: { ...state.isLoading, userStats: false },
        error: null,
      }));
    } catch (error) {
      set(state => ({
        isLoading: { ...state.isLoading, userStats: false },
        error: error instanceof Error ? error.message : '获取用户统计失败',
      }));
    }
  },

  fetchTransactionStats: async (period: string) => {
    const token = useAdminAuth.getState().token;
    if (!token) {
      set({ error: '未认证' });
      return;
    }

    set(state => ({
      isLoading: { ...state.isLoading, transactionStats: true },
      error: null,
    }));

    try {
      const response = await fetch(`/api/admin/dashboard/transactions?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || '获取交易统计失败');
      }

      set(state => ({
        transactionStats: data.data,
        isLoading: { ...state.isLoading, transactionStats: false },
        error: null,
      }));
    } catch (error) {
      set(state => ({
        isLoading: { ...state.isLoading, transactionStats: false },
        error: error instanceof Error ? error.message : '获取交易统计失败',
      }));
    }
  },

  fetchSystemResources: async () => {
    const token = useAdminAuth.getState().token;
    if (!token) {
      set({ error: '未认证' });
      return;
    }

    set(state => ({
      isLoading: { ...state.isLoading, systemResources: true },
      error: null,
    }));

    try {
      const response = await fetch('/api/admin/dashboard/system', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || '获取系统资源失败');
      }

      set(state => ({
        systemResources: data.data,
        isLoading: { ...state.isLoading, systemResources: false },
        error: null,
      }));
    } catch (error) {
      set(state => ({
        isLoading: { ...state.isLoading, systemResources: false },
        error: error instanceof Error ? error.message : '获取系统资源失败',
      }));
    }
  },

  clearError: () => set({ error: null }),
})); 