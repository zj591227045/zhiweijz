import { create } from 'zustand';
import { toast } from 'sonner';
import { adminApi, ADMIN_API_ENDPOINTS } from '@/lib/admin-api-client';

interface UserPointsStats {
  id: string;
  email: string;
  name: string;
  giftBalance: number;
  memberBalance: number;
  totalBalance: number;
  createdAt: string;
  lastUpdated: string;
}

interface OverallStats {
  totalGiftBalance: number;
  totalMemberBalance: number;
  totalBalance: number;
  totalUsers: number;
  todayConsumption: number;
  todayAddition: number;
  consumptionByType: Array<{
    type: string;
    totalPoints: number;
    totalTransactions: number;
  }>;
}

interface PointsTransaction {
  id: string;
  type: string;
  operation: string;
  points: number;
  balanceType: string;
  balanceAfter: number;
  description?: string;
  createdAt: string;
}

interface PointsConfig {
  pointCosts: Record<string, number>;
  checkinReward: number;
  dailyGift: number;
  giftBalanceLimit: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'totalBalance' | 'giftBalance' | 'memberBalance' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

interface AccountingPointsManagementState {
  // 数据状态
  users: UserPointsStats[];
  overallStats: OverallStats | null;
  userTransactions: PointsTransaction[];
  pointsConfig: PointsConfig | null;
  pagination: Pagination;
  
  // UI状态
  isLoading: boolean;
  isLoadingTransactions: boolean;
  isLoadingStats: boolean;
  
  // 操作函数
  fetchUsersStats: (params?: UserListParams) => Promise<void>;
  fetchOverallStats: () => Promise<void>;
  fetchUserTransactions: (userId: string, page?: number) => Promise<void>;
  fetchPointsConfig: () => Promise<void>;
  addPointsToUser: (userId: string, points: number, description?: string) => Promise<void>;
  batchAddPoints: (userIds: string[], points: number, description?: string) => Promise<void>;
  clearUserTransactions: () => void;
}

export const useAccountingPointsManagement = create<AccountingPointsManagementState>((set, get) => ({
  // 初始状态
  users: [],
  overallStats: null,
  userTransactions: [],
  pointsConfig: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  isLoading: false,
  isLoadingTransactions: false,
  isLoadingStats: false,

  // 获取用户记账点统计
  fetchUsersStats: async (params = {}) => {
    set({ isLoading: true });
    try {
      const response = await adminApi.get(ADMIN_API_ENDPOINTS.ACCOUNTING_POINTS_USERS + '?' + new URLSearchParams({
        page: String(params.page || 1),
        limit: String(params.limit || 20),
        search: params.search || '',
        sortBy: params.sortBy || 'totalBalance',
        sortOrder: params.sortOrder || 'desc'
      }));

      if (response.ok) {
        const data = await response.json();

        if (data?.success) {
          set({
            users: data.data.users,
            pagination: data.data.pagination
          });
        } else {
          console.error('📊 [AccountingPoints] API returned unsuccessful response:', data);
          toast.error('获取用户记账点统计失败');
        }
      } else {
        console.error('📊 [AccountingPoints] API request failed:', response.status, response.statusText);
        toast.error('获取用户记账点统计失败');
      }
    } catch (error) {
      console.error('获取用户记账点统计失败:', error);
      toast.error('获取用户记账点统计失败');
    } finally {
      set({ isLoading: false });
    }
  },

  // 获取总体统计
  fetchOverallStats: async () => {
    set({ isLoadingStats: true });
    try {
      const response = await adminApi.get(ADMIN_API_ENDPOINTS.ACCOUNTING_POINTS_OVERALL);

      if (response.ok) {
        const data = await response.json();

        if (data?.success) {
          set({ overallStats: data.data });
        } else {
          console.error('📊 [AccountingPoints] Overall stats API returned unsuccessful response:', data);
          toast.error('获取总体统计失败');
        }
      } else {
        console.error('📊 [AccountingPoints] Overall stats API request failed:', response.status, response.statusText);
        toast.error('获取总体统计失败');
      }
    } catch (error) {
      console.error('获取总体统计失败:', error);
      toast.error('获取总体统计失败');
    } finally {
      set({ isLoadingStats: false });
    }
  },

  // 获取用户记账记录
  fetchUserTransactions: async (userId: string, page = 1) => {
    set({ isLoadingTransactions: true });
    try {
      const response = await adminApi.get(ADMIN_API_ENDPOINTS.ACCOUNTING_POINTS_USER_TRANSACTIONS(userId) + '?' + new URLSearchParams({
        page: String(page),
        limit: '50'
      }));

      if (response.ok) {
        const data = await response.json();
        if (data?.success) {
          set({ userTransactions: data.data.transactions });
        } else {
          toast.error('获取用户记账记录失败');
        }
      } else {
        toast.error('获取用户记账记录失败');
      }
    } catch (error) {
      console.error('获取用户记账记录失败:', error);
      toast.error('获取用户记账记录失败');
    } finally {
      set({ isLoadingTransactions: false });
    }
  },

  // 获取记账点配置
  fetchPointsConfig: async () => {
    try {
      const response = await adminApi.get(ADMIN_API_ENDPOINTS.ACCOUNTING_POINTS_CONFIG);

      if (response.ok) {
        const data = await response.json();
        if (data?.success) {
          set({ pointsConfig: data.data });
        } else {
          toast.error('获取记账点配置失败');
        }
      } else {
        toast.error('获取记账点配置失败');
      }
    } catch (error) {
      console.error('获取记账点配置失败:', error);
      toast.error('获取记账点配置失败');
    }
  },

  // 为用户添加记账点
  addPointsToUser: async (userId: string, points: number, description = '管理员手动添加') => {
    try {
      const response = await adminApi.post(ADMIN_API_ENDPOINTS.ACCOUNTING_POINTS_ADD(userId), {
        points,
        description
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.success) {
          toast.success(data.data.message);
          // 刷新用户列表
          get().fetchUsersStats();
          get().fetchOverallStats();
        } else {
          toast.error(data?.error || '添加记账点失败');
        }
      } else {
        toast.error('添加记账点失败');
      }
    } catch (error: any) {
      console.error('添加记账点失败:', error);
      toast.error('添加记账点失败');
    }
  },

  // 批量添加记账点
  batchAddPoints: async (userIds: string[], points: number, description = '管理员批量添加') => {
    try {
      const response = await adminApi.post(ADMIN_API_ENDPOINTS.ACCOUNTING_POINTS_BATCH_ADD, {
        userIds,
        points,
        description
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.success) {
          toast.success(data.data.message);
          // 刷新用户列表
          get().fetchUsersStats();
          get().fetchOverallStats();
        } else {
          toast.error(data?.error || '批量添加记账点失败');
        }
      } else {
        toast.error('批量添加记账点失败');
      }
    } catch (error: any) {
      console.error('批量添加记账点失败:', error);
      toast.error('批量添加记账点失败');
    }
  },

  // 清空用户记账记录
  clearUserTransactions: () => {
    set({ userTransactions: [] });
  }
}));