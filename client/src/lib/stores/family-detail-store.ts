import { create } from 'zustand';
import { apiClient } from '@/lib/api';
import { Family, FamilyDetail, FamilyMember, FamilyRole } from './family-store';

// 家庭统计数据 - 成员分布
export interface MemberDistribution {
  memberId: string;
  username: string;
  amount: number;
  percentage: number;
}

// 家庭统计数据 - 分类分布
export interface CategoryDistribution {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  percentage: number;
}

// 家庭统计数据 - 交易记录
export interface Transaction {
  id: string;
  categoryName: string;
  categoryIcon: string;
  description: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  memberName: string;
  date: string;
}

// 家庭统计数据
export interface FamilyStatisticsData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  memberDistribution: MemberDistribution[];
  categoryDistribution: CategoryDistribution[];
  recentTransactions: Transaction[];
}

// 邀请链接数据
export interface InvitationData {
  inviteCode: string;
  inviteLink: string;
  qrCodeUrl?: string;
  expiresAt: string;
}

// 更新家庭请求
export interface UpdateFamilyRequest {
  name?: string;
  description?: string;
}

// 家庭详情状态
interface FamilyDetailState {
  family: FamilyDetail | null;
  statistics: FamilyStatisticsData | null;
  invitation: InvitationData | null;
  isLoading: boolean;
  isStatisticsLoading: boolean;
  isInvitationLoading: boolean;
  error: string | null;

  // 获取家庭详情
  fetchFamilyDetail: (id: string) => Promise<void>;

  // 获取家庭统计数据
  fetchFamilyStatistics: (id: string, period?: string) => Promise<void>;

  // 生成邀请链接
  generateInvitation: (id: string, expiresInDays?: number) => Promise<InvitationData | null>;

  // 更新家庭信息
  updateFamily: (id: string, data: UpdateFamilyRequest) => Promise<boolean>;

  // 退出家庭
  leaveFamily: (id: string) => Promise<boolean>;

  // 解散家庭
  deleteFamily: (id: string) => Promise<boolean>;
}

// 创建家庭详情状态管理
export const useFamilyDetailStore = create<FamilyDetailState>((set, get) => ({
  family: null,
  statistics: null,
  invitation: null,
  isLoading: false,
  isStatisticsLoading: false,
  isInvitationLoading: false,
  error: null,

  // 获取家庭详情
  fetchFamilyDetail: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get(`/families/${id}`);
      set({ family: response, isLoading: false });
    } catch (error) {
      console.error('获取家庭详情失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取家庭详情失败'
      });
    }
  },

  // 获取家庭统计数据
  fetchFamilyStatistics: async (id: string, period = 'month') => {
    try {
      set({ isStatisticsLoading: true });
      const response = await apiClient.get(`/families/${id}/statistics?period=${period}`);
      set({ statistics: response, isStatisticsLoading: false });
    } catch (error) {
      console.error('获取家庭统计数据失败:', error);
      set({ isStatisticsLoading: false });

      // 设置默认数据，避免UI崩溃
      set({
        statistics: {
          totalIncome: 0,
          totalExpense: 0,
          balance: 0,
          memberDistribution: [],
          categoryDistribution: [],
          recentTransactions: []
        }
      });
    }
  },

  // 生成邀请链接
  generateInvitation: async (id: string, expiresInDays?: number) => {
    try {
      set({ isInvitationLoading: true });
      const response = await apiClient.post(`/families/${id}/invitations`, { expiresInDays });
      set({ invitation: response, isInvitationLoading: false });
      return response;
    } catch (error) {
      console.error('生成邀请链接失败:', error);
      set({ isInvitationLoading: false });
      return null;
    }
  },

  // 更新家庭信息
  updateFamily: async (id: string, data: UpdateFamilyRequest) => {
    try {
      set({ isLoading: true });
      const response = await apiClient.put(`/families/${id}`, data);

      // 更新本地状态
      const family = get().family;
      if (family) {
        set({
          family: { ...family, ...data },
          isLoading: false
        });
      }

      return true;
    } catch (error) {
      console.error('更新家庭信息失败:', error);
      set({ isLoading: false });
      return false;
    }
  },

  // 退出家庭
  leaveFamily: async (id: string) => {
    try {
      set({ isLoading: true });
      await apiClient.post(`/families/${id}/leave`);
      set({ isLoading: false });
      return true;
    } catch (error) {
      console.error('退出家庭失败:', error);
      set({ isLoading: false });
      return false;
    }
  },

  // 解散家庭
  deleteFamily: async (id: string) => {
    try {
      set({ isLoading: true });
      await apiClient.delete(`/families/${id}`);
      set({ isLoading: false });
      return true;
    } catch (error) {
      console.error('解散家庭失败:', error);
      set({ isLoading: false });
      return false;
    }
  },
}));
