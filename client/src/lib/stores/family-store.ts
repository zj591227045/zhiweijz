import { create } from 'zustand';
import { apiClient } from '@/lib/api';

// 家庭成员角色
export enum FamilyRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

// 家庭成员
export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  name: string;
  role: FamilyRole;
  isRegistered: boolean;
  createdAt: string;
  updatedAt: string;
}

// 用户信息
export interface UserInfo {
  id: string;
  name: string;
  email: string;
}

// 家庭信息
export interface Family {
  id: string;
  name: string;
  createdBy: string;
  creator?: UserInfo;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

// 家庭详情
export interface FamilyDetail extends Family {
  members: FamilyMember[];
}

// 创建家庭请求
export interface CreateFamilyRequest {
  name: string;
}

// 加入家庭请求
export interface JoinFamilyRequest {
  invitationCode: string;
}

// 家庭状态
interface FamilyState {
  families: Family[];
  currentFamily: FamilyDetail | null;
  isLoading: boolean;
  error: string | null;

  // 获取家庭列表
  fetchFamilies: () => Promise<void>;

  // 获取家庭详情
  fetchFamilyById: (id: string) => Promise<void>;

  // 创建家庭
  createFamily: (data: CreateFamilyRequest) => Promise<Family | null>;

  // 加入家庭
  joinFamily: (data: JoinFamilyRequest) => Promise<boolean>;

  // 退出家庭
  leaveFamily: (id: string) => Promise<boolean>;

  // 删除家庭
  deleteFamily: (id: string) => Promise<boolean>;
}

// 创建家庭状态管理
export const useFamilyStore = create<FamilyState>((set, get) => ({
  families: [],
  currentFamily: null,
  isLoading: false,
  error: null,

  // 获取家庭列表
  fetchFamilies: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get('/families');
      set({ families: response, isLoading: false });
    } catch (error) {
      console.error('获取家庭列表失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取家庭列表失败'
      });
    }
  },

  // 获取家庭详情
  fetchFamilyById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get(`/families/${id}`);
      set({ currentFamily: response, isLoading: false });
    } catch (error) {
      console.error('获取家庭详情失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取家庭详情失败'
      });
    }
  },

  // 创建家庭
  createFamily: async (data: CreateFamilyRequest) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.post('/families', data);

      // 更新家庭列表
      const families = get().families;
      set({
        families: [...families, response],
        isLoading: false
      });

      return response;
    } catch (error) {
      console.error('创建家庭失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '创建家庭失败'
      });
      return null;
    }
  },

  // 加入家庭
  joinFamily: async (data: JoinFamilyRequest) => {
    try {
      set({ isLoading: true, error: null });
      await apiClient.post('/families/join', data);

      // 重新获取家庭列表
      await get().fetchFamilies();

      return true;
    } catch (error) {
      console.error('加入家庭失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '加入家庭失败'
      });
      return false;
    }
  },

  // 退出家庭
  leaveFamily: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      await apiClient.post(`/families/${id}/leave`);

      // 更新家庭列表
      const families = get().families.filter(family => family.id !== id);
      set({ families, isLoading: false });

      return true;
    } catch (error) {
      console.error('退出家庭失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '退出家庭失败'
      });
      return false;
    }
  },

  // 删除家庭
  deleteFamily: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      await apiClient.delete(`/families/${id}`);

      // 更新家庭列表
      const families = get().families.filter(family => family.id !== id);
      set({ families, isLoading: false });

      return true;
    } catch (error) {
      console.error('删除家庭失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '删除家庭失败'
      });
      return false;
    }
  },
}));
