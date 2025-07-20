'use client';

import { create } from 'zustand';
import {
  systemConfigApi,
  GlobalAIConfig,
  AIServiceStatus,
  TodayTokenUsage,
  TokenUsageStats,
  TokenUsageParams,
} from '@/lib/api/system-config';
import { toast } from 'sonner';

// 全局AI状态类型
interface GlobalAIState {
  // 数据状态
  globalConfig: GlobalAIConfig | null;
  userAIEnabled: boolean; // 用户级别AI服务启用状态
  serviceStatus: AIServiceStatus | null;
  todayUsage: TodayTokenUsage | null;
  tokenStats: TokenUsageStats | null;
  activeService: any | null; // 当前账本激活的AI服务

  // 加载状态
  isLoadingConfig: boolean;
  isLoadingUserAI: boolean; // 用户AI状态加载中
  isLoadingStatus: boolean;
  isLoadingUsage: boolean;
  isLoadingStats: boolean;
  isLoadingActiveService: boolean;

  // 错误状态
  configError: string | null;
  userAIError: string | null; // 用户AI状态错误
  statusError: string | null;
  usageError: string | null;
  statsError: string | null;
  activeServiceError: string | null;

  // 操作方法
  fetchGlobalConfig: () => Promise<void>;
  fetchUserAIEnabled: () => Promise<void>; // 获取用户AI服务状态
  fetchServiceStatus: () => Promise<void>;
  fetchTodayUsage: () => Promise<void>;
  fetchTokenStats: (params?: TokenUsageParams) => Promise<void>;
  fetchAccountActiveService: (accountId: string) => Promise<void>;
  updateGlobalConfig: (config: Partial<GlobalAIConfig>) => Promise<void>;
  toggleUserAIService: (enabled: boolean) => Promise<void>; // 切换用户AI服务状态
  switchServiceType: (
    serviceType: 'official' | 'custom',
    serviceId?: string,
    accountId?: string,
  ) => Promise<void>;
  testServiceConnection: (
    serviceType: 'official' | 'custom',
    serviceId?: string,
  ) => Promise<{ success: boolean; message: string; responseTime?: number }>;
  refreshAll: (accountId?: string) => Promise<void>;
  clearErrors: () => void;
}

// 创建全局AI状态管理
export const useGlobalAIStore = create<GlobalAIState>((set, get) => ({
  // 初始状态
  globalConfig: null,
  userAIEnabled: false, // 默认用户AI服务未启用
  serviceStatus: null,
  todayUsage: null,
  tokenStats: null,
  activeService: null,

  isLoadingConfig: false,
  isLoadingUserAI: false, // 用户AI状态加载状态
  isLoadingStatus: false,
  isLoadingUsage: false,
  isLoadingStats: false,
  isLoadingActiveService: false,

  configError: null,
  userAIError: null, // 用户AI状态错误
  statusError: null,
  usageError: null,
  statsError: null,
  activeServiceError: null,

  // 获取全局AI配置
  fetchGlobalConfig: async () => {
    set({ isLoadingConfig: true, configError: null });
    try {
      const config = await systemConfigApi.getGlobalAIConfig();
      set({ globalConfig: config, isLoadingConfig: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取全局AI配置失败';
      set({ configError: errorMessage, isLoadingConfig: false });
      console.error('获取全局AI配置失败:', error);
    }
  },

  // 获取用户级别AI服务启用状态
  fetchUserAIEnabled: async () => {
    set({ isLoadingUserAI: true, userAIError: null });
    try {
      const enabled = await systemConfigApi.getUserAIServiceEnabled();
      set({ userAIEnabled: enabled, isLoadingUserAI: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取用户AI服务状态失败';
      set({ userAIError: errorMessage, isLoadingUserAI: false });
      console.error('获取用户AI服务状态失败:', error);
    }
  },

  // 切换用户级别AI服务状态
  toggleUserAIService: async (enabled: boolean) => {
    set({ isLoadingUserAI: true, userAIError: null });
    try {
      await systemConfigApi.toggleUserAIService(enabled);
      set({ userAIEnabled: enabled, isLoadingUserAI: false });
      toast.success(enabled ? 'AI服务已启用' : 'AI服务已禁用');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '切换用户AI服务状态失败';
      set({ userAIError: errorMessage, isLoadingUserAI: false });
      toast.error(errorMessage);
      console.error('切换用户AI服务状态失败:', error);
      throw error;
    }
  },

  // 获取AI服务状态
  fetchServiceStatus: async () => {
    set({ isLoadingStatus: true, statusError: null });
    try {
      const status = await systemConfigApi.getAIServiceStatus();
      set({ serviceStatus: status, isLoadingStatus: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取AI服务状态失败';
      set({ statusError: errorMessage, isLoadingStatus: false });
      console.error('获取AI服务状态失败:', error);
    }
  },

  // 获取今日TOKEN使用量
  fetchTodayUsage: async () => {
    set({ isLoadingUsage: true, usageError: null });
    try {
      const usage = await systemConfigApi.getTodayTokenUsage();
      set({ todayUsage: usage, isLoadingUsage: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取今日TOKEN使用量失败';
      set({ usageError: errorMessage, isLoadingUsage: false });
      console.error('获取今日TOKEN使用量失败:', error);
    }
  },

  // 获取TOKEN使用量统计
  fetchTokenStats: async (params?: TokenUsageParams) => {
    set({ isLoadingStats: true, statsError: null });
    try {
      const stats = await systemConfigApi.getTokenUsage(params);
      set({ tokenStats: stats, isLoadingStats: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取TOKEN使用量统计失败';
      set({ statsError: errorMessage, isLoadingStats: false });
      console.error('获取TOKEN使用量统计失败:', error);
    }
  },

  // 获取账本激活服务
  fetchAccountActiveService: async (accountId: string) => {
    set({ isLoadingActiveService: true, activeServiceError: null });
    try {
      const activeService = await systemConfigApi.getAccountActiveService(accountId);
      set({ activeService, isLoadingActiveService: false });
    } catch (error: any) {
      let errorMessage = '获取账本激活服务失败';

      // 对403错误进行特殊处理
      if (error?.response?.status === 403) {
        errorMessage = '您没有权限访问此账本的AI服务配置';
        // 对于403错误，设置一个默认的未启用状态
        set({
          activeService: {
            enabled: false,
            type: null,
            maxTokens: 1000,
            usedTokens: 0,
          },
          isLoadingActiveService: false,
          activeServiceError: errorMessage,
        });
        return;
      }

      // 对于其他错误
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      set({
        activeServiceError: errorMessage,
        isLoadingActiveService: false,
        activeService: null,
      });
      console.error('获取账本激活服务失败:', error);
    }
  },

  // 更新全局AI配置
  updateGlobalConfig: async (config: Partial<GlobalAIConfig>) => {
    set({ isLoadingConfig: true, configError: null });
    try {
      const updatedConfig = await systemConfigApi.updateGlobalAIConfig(config);
      set({ globalConfig: updatedConfig, isLoadingConfig: false });
      toast.success('AI配置更新成功');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新AI配置失败';
      set({ configError: errorMessage, isLoadingConfig: false });
      toast.error(errorMessage);
      console.error('更新AI配置失败:', error);
      throw error;
    }
  },

  // 切换AI服务类型
  switchServiceType: async (
    serviceType: 'official' | 'custom',
    serviceId?: string,
    accountId?: string,
  ) => {
    try {
      const result = await systemConfigApi.switchAIServiceType(serviceType, serviceId, accountId);
      if (result.success) {
        toast.success(result.message || 'AI服务切换成功');
        // 刷新配置
        await get().fetchGlobalConfig();
      } else {
        toast.error(result.message || 'AI服务切换失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'AI服务切换失败';
      toast.error(errorMessage);
      console.error('AI服务切换失败:', error);
      throw error;
    }
  },

  // 测试AI服务连接
  testServiceConnection: async (serviceType: 'official' | 'custom', serviceId?: string) => {
    try {
      // 如果是自定义服务但没有提供serviceId，跳过测试
      if (serviceType === 'custom' && !serviceId) {
        return {
          success: true,
          message: '自定义服务类型切换成功，请选择具体的服务',
        };
      }

      const result = await systemConfigApi.testAIServiceConnection(serviceType, serviceId);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '测试AI服务连接失败';
      console.error('测试AI服务连接失败:', error);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  // 刷新所有数据
  refreshAll: async (accountId?: string) => {
    const {
      fetchGlobalConfig,
      fetchUserAIEnabled,
      fetchServiceStatus,
      fetchTodayUsage,
      fetchAccountActiveService,
    } = get();
    await Promise.all([
      fetchGlobalConfig(),
      fetchUserAIEnabled(), // 同时获取用户AI服务状态
      fetchServiceStatus(),
      fetchTodayUsage(),
      fetchAccountActiveService(accountId || ''),
    ]);
  },

  // 清除错误状态
  clearErrors: () => {
    set({
      configError: null,
      userAIError: null, // 清除用户AI错误状态
      statusError: null,
      usageError: null,
      statsError: null,
      activeServiceError: null,
    });
  },
}));
