import { create } from 'zustand';
import { apiClient } from '@/lib/api';
import { Role } from './family-store';

// 成员统计数据
export interface MemberStatistics {
  totalExpense: number;
  percentage: number;
  transactionCount: number;
}

// 家庭成员
export interface FamilyMember {
  memberId: string;
  userId: string | null;
  username: string;
  avatar: string | null;
  role: Role;
  joinedAt: string;
  isCurrentUser: boolean;
  statistics: MemberStatistics;
}

// 邀请链接数据
export interface InvitationData {
  id: string;
  familyId: string;
  invitationCode: string;
  expiresAt: string;
  url: string;
  createdAt: string;
  isUsed: boolean;
  usedAt?: string;
  usedByUserId?: string;
  usedByUserName?: string;
}

// 用户权限
export interface UserPermissions {
  canInvite: boolean;
  canRemove: boolean;
  canChangeRoles: boolean;
}

// 成员管理状态
interface FamilyMembersState {
  familyId: string | null;
  members: FamilyMember[];
  invitation: InvitationData | null;
  invitations: InvitationData[];
  totalExpense: number;
  period: 'month' | 'last_month' | 'all';
  userPermissions: UserPermissions;
  isLoading: boolean;
  isInvitationLoading: boolean;
  isInvitationsLoading: boolean;
  isRoleUpdating: boolean;
  isRemoving: boolean;
  error: string | null;

  // 设置家庭ID
  setFamilyId: (id: string) => void;

  // 获取成员列表
  fetchMembers: () => Promise<void>;

  // 获取成员统计
  fetchMemberStatistics: (period?: 'month' | 'last_month' | 'all') => Promise<void>;

  // 更新成员角色
  updateMemberRole: (memberId: string, role: Role) => Promise<boolean>;

  // 移除成员
  removeMember: (memberId: string) => Promise<boolean>;

  // 生成邀请链接
  generateInvitation: (expiresInDays?: number) => Promise<InvitationData | null>;

  // 获取邀请列表
  fetchInvitations: () => Promise<InvitationData[]>;

  // 设置时间范围
  setPeriod: (period: 'month' | 'last_month' | 'all') => void;
}

// 创建成员管理状态仓库
export const useFamilyMembersStore = create<FamilyMembersState>((set, get) => ({
  familyId: null,
  members: [],
  invitation: null,
  invitations: [],
  totalExpense: 0,
  period: 'month',
  userPermissions: {
    canInvite: false,
    canRemove: false,
    canChangeRoles: false
  },
  isLoading: false,
  isInvitationLoading: false,
  isInvitationsLoading: false,
  isRoleUpdating: false,
  isRemoving: false,
  error: null,

  // 设置家庭ID
  setFamilyId: (id: string) => {
    set({ familyId: id, invitation: null }); // 重置邀请码
  },

  // 获取成员列表和统计数据
  fetchMembers: async () => {
    const { familyId } = get();
    if (!familyId) return;

    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get(`/families/${familyId}/members/statistics?period=${get().period}`);

      set({
        members: response.members,
        totalExpense: response.totalExpense,
        userPermissions: response.userPermissions,
        isLoading: false
      });
    } catch (error) {
      console.error('获取家庭成员失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取家庭成员失败'
      });
    }
  },

  // 获取成员统计
  fetchMemberStatistics: async (period = 'month') => {
    const { familyId } = get();
    if (!familyId) return;

    try {
      set({ isLoading: true, period, error: null });
      const response = await apiClient.get(`/families/${familyId}/members/statistics?period=${period}`);

      set({
        members: response.members,
        totalExpense: response.totalExpense,
        isLoading: false
      });
    } catch (error) {
      console.error('获取成员统计失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取成员统计失败'
      });
    }
  },

  // 更新成员角色
  updateMemberRole: async (memberId: string, role: Role) => {
    const { familyId } = get();
    if (!familyId) return false;

    try {
      set({ isRoleUpdating: true, error: null });
      await apiClient.put(`/families/${familyId}/members/${memberId}/role`, { role });

      // 更新本地状态
      const members = get().members.map(member =>
        member.memberId === memberId ? { ...member, role } : member
      );

      set({ members, isRoleUpdating: false });
      return true;
    } catch (error) {
      console.error('更新成员角色失败:', error);
      set({
        isRoleUpdating: false,
        error: error instanceof Error ? error.message : '更新成员角色失败'
      });
      return false;
    }
  },

  // 移除成员
  removeMember: async (memberId: string) => {
    const { familyId } = get();
    if (!familyId) return false;

    try {
      set({ isRemoving: true, error: null });
      await apiClient.delete(`/families/${familyId}/members/${memberId}`);

      // 更新本地状态
      const members = get().members.filter(member => member.memberId !== memberId);

      set({ members, isRemoving: false });
      return true;
    } catch (error) {
      console.error('移除成员失败:', error);
      set({
        isRemoving: false,
        error: error instanceof Error ? error.message : '移除成员失败'
      });
      return false;
    }
  },

  // 生成邀请链接
  generateInvitation: async (expiresInDays = 7) => {
    const { familyId } = get();
    if (!familyId) return null;

    try {
      set({ isInvitationLoading: true, error: null });
      const response = await apiClient.post(`/families/${familyId}/invitations`, { expiresInDays });

      set({ invitation: response, isInvitationLoading: false });

      // 刷新邀请列表
      get().fetchInvitations();

      return response;
    } catch (error) {
      console.error('生成邀请链接失败:', error);
      set({
        isInvitationLoading: false,
        error: error instanceof Error ? error.message : '生成邀请链接失败'
      });
      return null;
    }
  },

  // 获取邀请列表
  fetchInvitations: async () => {
    const { familyId } = get();
    if (!familyId) {
      console.log('fetchInvitations: 没有家庭ID，返回空数组');
      return [];
    }

    try {
      console.log(`fetchInvitations: 开始获取家庭 ${familyId} 的邀请列表`);
      set({ isInvitationsLoading: true, error: null });
      const response = await apiClient.get(`/families/${familyId}/invitations`);

      console.log('fetchInvitations: 获取到原始响应:', response);

      // 确保response是数组
      const invitationsArray = Array.isArray(response) ? response : [];
      console.log(`fetchInvitations: 处理后的邀请数组长度: ${invitationsArray.length}`);

      invitationsArray.forEach((invitation, index) => {
        console.log(`邀请 ${index + 1}:`, invitation);
      });

      set({ invitations: invitationsArray, isInvitationsLoading: false });
      return invitationsArray;
    } catch (error) {
      console.error('获取邀请列表失败:', error);
      set({
        isInvitationsLoading: false,
        error: error instanceof Error ? error.message : '获取邀请列表失败'
      });
      return [];
    }
  },

  // 设置时间范围
  setPeriod: (period: 'month' | 'last_month' | 'all') => {
    set({ period });
    get().fetchMemberStatistics(period);
  }
}));
