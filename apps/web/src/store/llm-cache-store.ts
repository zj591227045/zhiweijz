'use client';

import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

// LLM设置类型
interface LLMSettings {
  id?: string;
  bound: boolean;
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}

// LLM缓存状态类型
interface LLMCacheState {
  // 状态
  llmCache: Record<string, LLMSettings>;
  isLoading: boolean;
  error: string | null;

  // 操作方法
  getLLMSettings: (accountBookId: string, userId: string | null) => Promise<LLMSettings>;
  updateLLMSettings: (accountBookId: string, settings: Partial<LLMSettings>) => Promise<boolean>;
  clearCache: (accountBookId?: string) => void;
  clearError: () => void;
}

// 创建LLM缓存状态管理
export const useLLMCacheStore = create<LLMCacheState>((set, get) => ({
  // 初始状态
  llmCache: {},
  isLoading: false,
  error: null,

  // 获取LLM设置
  getLLMSettings: async (accountBookId, userId) => {
    try {
      const { llmCache } = get();

      // 检查缓存
      if (llmCache[accountBookId]) {
        return llmCache[accountBookId];
      }

      set({ isLoading: true, error: null });

      // 使用正确的API端点获取账本LLM设置
      const response = await apiClient.get(`/ai/account/${accountBookId}/llm-settings`);

      const settings = response.data;

      // 更新缓存
      set((state) => ({
        llmCache: {
          ...state.llmCache,
          [accountBookId]: settings,
        },
        isLoading: false,
        error: null,
      }));

      return settings;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '获取LLM设置失败';
      set({
        isLoading: false,
        error: errorMessage,
      });

      // 返回默认设置
      const defaultSettings = { bound: false };

      // 缓存默认设置
      set((state) => ({
        llmCache: {
          ...state.llmCache,
          [accountBookId]: defaultSettings,
        },
      }));

      return defaultSettings;
    }
  },

  // 更新LLM设置
  updateLLMSettings: async (accountBookId, settings) => {
    try {
      set({ isLoading: true, error: null });

      // 使用正确的API端点更新账本LLM设置
      const response = await apiClient.put(`/ai/account/${accountBookId}/llm-settings`, settings);

      const updatedSettings = response.data;

      // 更新缓存
      set((state) => ({
        llmCache: {
          ...state.llmCache,
          [accountBookId]: updatedSettings,
        },
        isLoading: false,
        error: null,
      }));

      toast.success('LLM设置更新成功');
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '更新LLM设置失败';
      set({
        isLoading: false,
        error: errorMessage,
      });
      toast.error(errorMessage);
      return false;
    }
  },

  // 清除缓存
  clearCache: (accountBookId) => {
    if (accountBookId) {
      set((state) => {
        const newCache = { ...state.llmCache };
        delete newCache[accountBookId];
        return { llmCache: newCache };
      });
    } else {
      set({ llmCache: {} });
    }
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },
}));
