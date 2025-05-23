import { create } from 'zustand';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Family, CreateFamilyData } from '@/types';

interface FamilyState {
  // 数据状态
  families: Family[];
  currentFamily: Family | null;
  isLoading: boolean;
  error: string | null;

  // 操作方法
  fetchFamilies: () => Promise<void>;
  fetchFamily: (id: string) => Promise<void>;
  createFamily: (data: CreateFamilyData) => Promise<boolean>;
  joinFamily: (inviteCode: string) => Promise<boolean>;
  leaveFamily: (id: string) => Promise<boolean>;
  deleteFamily: (id: string) => Promise<boolean>;
  resetState: () => void;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  // 初始数据状态
  families: [],
  currentFamily: null,
  isLoading: false,
  error: null,

  // 获取家庭列表
  fetchFamilies: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.get('/families');
      
      // 处理API响应
      let familiesData = [];
      
      if (Array.isArray(response)) {
        familiesData = response;
      } else if (response.data && Array.isArray(response.data)) {
        familiesData = response.data;
      } else if (response.families && Array.isArray(response.families)) {
        familiesData = response.families;
      }
      
      set({ families: familiesData, isLoading: false });
    } catch (error) {
      console.error('获取家庭列表失败:', error);
      set({
        isLoading: false,
        error: '获取家庭列表失败，请重试'
      });
      toast.error('获取家庭列表失败，请重试');
    }
  },

  // 获取单个家庭详情
  fetchFamily: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.get(`/families/${id}`);
      
      set({ currentFamily: response, isLoading: false });
    } catch (error) {
      console.error('获取家庭详情失败:', error);
      set({
        isLoading: false,
        error: '获取家庭详情失败，请重试'
      });
      toast.error('获取家庭详情失败，请重试');
    }
  },

  // 创建家庭
  createFamily: async (data: CreateFamilyData) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.post('/families', data);
      
      // 更新家庭列表
      const { families } = get();
      set({ 
        families: [...families, response],
        isLoading: false 
      });
      
      toast.success('家庭创建成功');
      return true;
    } catch (error) {
      console.error('创建家庭失败:', error);
      set({
        isLoading: false,
        error: '创建家庭失败，请重试'
      });
      toast.error('创建家庭失败，请重试');
      return false;
    }
  },

  // 加入家庭
  joinFamily: async (inviteCode: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.post('/families/join', { inviteCode });
      
      // 更新家庭列表
      await get().fetchFamilies();
      
      toast.success('成功加入家庭');
      return true;
    } catch (error) {
      console.error('加入家庭失败:', error);
      set({
        isLoading: false,
        error: '加入家庭失败，请检查邀请码是否正确'
      });
      toast.error('加入家庭失败，请检查邀请码是否正确');
      return false;
    }
  },

  // 退出家庭
  leaveFamily: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      await apiClient.post(`/families/${id}/leave`);
      
      // 更新家庭列表
      const { families } = get();
      set({ 
        families: families.filter(family => family.id !== id),
        isLoading: false 
      });
      
      toast.success('已退出家庭');
      return true;
    } catch (error) {
      console.error('退出家庭失败:', error);
      set({
        isLoading: false,
        error: '退出家庭失败，请重试'
      });
      toast.error('退出家庭失败，请重试');
      return false;
    }
  },

  // 删除家庭
  deleteFamily: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      await apiClient.delete(`/families/${id}`);
      
      // 更新家庭列表
      const { families } = get();
      set({ 
        families: families.filter(family => family.id !== id),
        isLoading: false 
      });
      
      toast.success('家庭已删除');
      return true;
    } catch (error) {
      console.error('删除家庭失败:', error);
      set({
        isLoading: false,
        error: '删除家庭失败，请重试'
      });
      toast.error('删除家庭失败，请重试');
      return false;
    }
  },

  // 重置状态
  resetState: () => {
    set({
      families: [],
      currentFamily: null,
      isLoading: false,
      error: null
    });
  }
}));
