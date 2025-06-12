'use client';

import { create } from 'zustand';
import { aiService, LLMSetting } from '@/lib/api/ai-service';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

// AI服务状态类型
interface AIServicesState {
  // 数据状态
  services: LLMSetting[];
  isLoading: boolean;
  error: string | null;

  // 操作方法
  fetchServices: () => Promise<void>;
  createService: (data: any) => Promise<boolean>;
  updateService: (id: string, data: any) => Promise<boolean>;
  deleteService: (id: string) => Promise<boolean>;
  refreshServices: () => Promise<void>;
}

// 创建AI服务状态管理
export const useAIServicesStore = create<AIServicesState>((set, get) => ({
  // 初始状态
  services: [],
  isLoading: false,
  error: null,

  // 获取AI服务列表
  fetchServices: async () => {
    try {
      set({ isLoading: true, error: null });

      console.log('🔄 正在获取AI服务列表...');
      const data = await aiService.getLLMSettingsList();
      console.log('🔄 获取到的AI服务列表:', data);

      // 确保返回的数据是数组
      if (Array.isArray(data)) {
        console.log(`🔄 成功获取到 ${data.length} 个AI服务`);
        set({
          services: data,
          isLoading: false,
        });
      } else {
        console.warn('🔄 API返回的数据不是数组:', data);
        set({
          services: [],
          isLoading: false,
          error: 'API返回的数据格式不正确',
        });
        toast.error('数据格式错误');
      }
    } catch (error) {
      console.error('🔄 获取AI服务列表失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取AI服务列表失败',
      });
      toast.error('获取AI服务列表失败');
    }
  },

  // 创建AI服务
  createService: async (data) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.post('/ai/llm-settings', data);

      set({ isLoading: false });
      toast.success('AI服务创建成功');

      // 创建成功后，刷新服务列表
      const { refreshServices } = get();
      await refreshServices();

      return true;
    } catch (error) {
      console.error('创建AI服务失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '创建AI服务失败',
      });
      toast.error('创建AI服务失败');
      return false;
    }
  },

  // 更新AI服务
  updateService: async (id, data) => {
    try {
      set({ isLoading: true, error: null });

      await apiClient.put(`/ai/llm-settings/${id}`, data);

      set({ isLoading: false });
      toast.success('AI服务更新成功');

      // 更新成功后，刷新服务列表
      const { refreshServices } = get();
      await refreshServices();

      return true;
    } catch (error) {
      console.error('更新AI服务失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '更新AI服务失败',
      });
      toast.error('更新AI服务失败');
      return false;
    }
  },

  // 删除AI服务
  deleteService: async (id) => {
    try {
      set({ isLoading: true, error: null });

      await aiService.deleteLLMSettings(id);

      set({ isLoading: false });
      toast.success('AI服务已删除');

      // 删除成功后，刷新服务列表
      const { refreshServices } = get();
      await refreshServices();

      return true;
    } catch (error) {
      console.error('删除AI服务失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '删除AI服务失败',
      });
      toast.error('删除AI服务失败');
      return false;
    }
  },

  // 刷新AI服务列表
  refreshServices: async () => {
    const { fetchServices } = get();
    await fetchServices();
  },
}));
