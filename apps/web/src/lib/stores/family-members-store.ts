import { create } from 'zustand';
import { FamilyMember, InvitationData, UserPermissions, Role } from '@/types/family';
import { fetchApi } from '@/lib/api-client';

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
  fetchMembers: (token: string) => Promise<void>;

  // 获取成员统计
  fetchMemberStatistics: (token: string, period?: 'month' | 'last_month' | 'all') => Promise<void>;

  // 更新成员角色
  updateMemberRole: (token: string, memberId: string, role: Role) => Promise<boolean>;

  // 移除成员
  removeMember: (token: string, memberId: string) => Promise<boolean>;

  // 生成邀请链接
  generateInvitation: (token: string, expiresInDays?: number) => Promise<InvitationData | null>;

  // 获取邀请列表
  fetchInvitations: (token: string) => Promise<InvitationData[]>;

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
    canChangeRoles: false,
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
  fetchMembers: async (token: string) => {
    const { familyId } = get();
    if (!familyId) return;

    try {
      set({ isLoading: true, error: null });
      const url = `/api/families/${familyId}/members/statistics?period=${get().period}`;
      console.log('fetchMembers: 调用API:', url);
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        set({
          members: data.members || [],
          totalExpense: data.totalExpense || 0,
          userPermissions: data.userPermissions || {
            canInvite: false,
            canRemove: false,
            canChangeRoles: false,
          },
          isLoading: false,
        });
      } else {
        const errorData = await response.json();
        set({
          isLoading: false,
          error: errorData.message || '获取家庭成员失败',
        });
      }
    } catch (error) {
      console.error('获取家庭成员失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取家庭成员失败',
      });
    }
  },

  // 获取成员统计
  fetchMemberStatistics: async (token: string, period = 'month') => {
    const { familyId } = get();
    if (!familyId) return;

    try {
      set({ isLoading: true, period, error: null });
      const response = await fetch(
        `/api/families/${familyId}/members/statistics?period=${period}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        set({
          members: data.members || [],
          totalExpense: data.totalExpense || 0,
          isLoading: false,
        });
      } else {
        const errorData = await response.json();
        set({
          isLoading: false,
          error: errorData.message || '获取成员统计失败',
        });
      }
    } catch (error) {
      console.error('获取成员统计失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取成员统计失败',
      });
    }
  },

  // 更新成员角色
  updateMemberRole: async (token: string, memberId: string, role: Role) => {
    const { familyId } = get();
    if (!familyId) return false;

    try {
      set({ isRoleUpdating: true, error: null });
      const response = await fetchApi(`/api/families/${familyId}/members/${memberId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        // 更新本地状态
        const members = get().members.map((member) =>
          member.memberId === memberId ? { ...member, role } : member,
        );

        set({ members, isRoleUpdating: false });
        return true;
      } else {
        const errorData = await response.json();
        set({
          isRoleUpdating: false,
          error: errorData.message || '更新成员角色失败',
        });
        return false;
      }
    } catch (error) {
      console.error('更新成员角色失败:', error);
      set({
        isRoleUpdating: false,
        error: error instanceof Error ? error.message : '更新成员角色失败',
      });
      return false;
    }
  },

  // 移除成员
  removeMember: async (token: string, memberId: string) => {
    const { familyId } = get();
    if (!familyId) return false;

    try {
      set({ isRemoving: true, error: null });
      const response = await fetch(`/api/families/${familyId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // 更新本地状态
        const members = get().members.filter((member) => member.memberId !== memberId);
        set({ members, isRemoving: false });
        return true;
      } else {
        const errorData = await response.json();
        set({
          isRemoving: false,
          error: errorData.message || '移除成员失败',
        });
        return false;
      }
    } catch (error) {
      console.error('移除成员失败:', error);
      set({
        isRemoving: false,
        error: error instanceof Error ? error.message : '移除成员失败',
      });
      return false;
    }
  },

  // 生成邀请链接
  generateInvitation: async (token: string, expiresInDays = 7) => {
    const { familyId } = get();
    if (!familyId) return null;

    try {
      set({ isInvitationLoading: true, error: null });
      const response = await fetch(`/api/families/${familyId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expiresInDays }),
      });

      if (response.ok) {
        const data = await response.json();
        set({ invitation: data, isInvitationLoading: false });

        // 刷新邀请列表
        get().fetchInvitations(token);

        return data;
      } else {
        const errorData = await response.json();
        set({
          isInvitationLoading: false,
          error: errorData.message || '生成邀请链接失败',
        });
        return null;
      }
    } catch (error) {
      console.error('生成邀请链接失败:', error);
      set({
        isInvitationLoading: false,
        error: error instanceof Error ? error.message : '生成邀请链接失败',
      });
      return null;
    }
  },

  // 获取邀请列表
  fetchInvitations: async (token: string) => {
    const { familyId } = get();
    if (!familyId) {
      console.log('fetchInvitations: 没有家庭ID，返回空数组');
      return [];
    }

    try {
      console.log(`fetchInvitations: 开始获取家庭 ${familyId} 的邀请列表`);
      set({ isInvitationsLoading: true, error: null });
      const response = await fetch(`/api/families/${familyId}/invitations`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('fetchInvitations: 获取到原始响应:', data);

        // 确保response是数组
        const invitationsArray = Array.isArray(data) ? data : [];
        console.log(`fetchInvitations: 处理后的邀请数组长度: ${invitationsArray.length}`);

        invitationsArray.forEach((invitation, index) => {
          console.log(`邀请 ${index + 1}:`, invitation);
        });

        set({ invitations: invitationsArray, isInvitationsLoading: false });
        return invitationsArray;
      } else {
        const errorData = await response.json();
        set({
          isInvitationsLoading: false,
          error: errorData.message || '获取邀请列表失败',
        });
        return [];
      }
    } catch (error) {
      console.error('获取邀请列表失败:', error);
      set({
        isInvitationsLoading: false,
        error: error instanceof Error ? error.message : '获取邀请列表失败',
      });
      return [];
    }
  },

  // 设置时间范围
  setPeriod: (period: 'month' | 'last_month' | 'all') => {
    const currentPeriod = get().period;
    if (currentPeriod !== period) {
      set({ period });
    }
  },
}));
