/**
 * 系统配置相关的React Query hooks
 * 
 * 用于替换手动fetch，消除重复请求
 */

import { useQuery } from '@tanstack/react-query';
import { systemConfigApi, type GlobalAIConfig } from '@/lib/api/system-config';
import { getApiBaseUrl } from '@/lib/server-config';

// 查询键常量
export const SYSTEM_CONFIG_KEYS = {
  all: ['systemConfig'] as const,
  globalAI: () => [...SYSTEM_CONFIG_KEYS.all, 'globalAI'] as const,
  features: () => [...SYSTEM_CONFIG_KEYS.all, 'features'] as const,
} as const;

/**
 * 获取全局AI配置
 */
export function useGlobalAIConfig() {
  return useQuery({
    queryKey: SYSTEM_CONFIG_KEYS.globalAI(),
    queryFn: () => systemConfigApi.getGlobalAIConfig(),
    staleTime: 5 * 60 * 1000, // 5分钟内认为数据是新鲜的
    gcTime: 10 * 60 * 1000,   // 10分钟后清理缓存
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * 获取系统功能配置
 */
export function useSystemFeatures() {
  return useQuery({
    queryKey: SYSTEM_CONFIG_KEYS.features(),
    queryFn: async () => {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/system/features`);
      
      if (!response.ok) {
        throw new Error(`获取系统配置失败: ${response.status}`);
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5分钟内认为数据是新鲜的
    gcTime: 10 * 60 * 1000,   // 10分钟后清理缓存
    retry: 2,
    retryDelay: 1000,
    // 默认值，避免loading状态
    placeholderData: {
      membershipEnabled: true,
      accountingPointsEnabled: true,
    },
  });
}