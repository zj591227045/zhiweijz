/**
 * 认证相关的React Query hooks
 * 
 * 用于替换手动的认证状态检查，消除重复请求
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { createLogger } from '@/lib/logger';

const authLogger = createLogger('Auth');

// 查询键常量
export const AUTH_KEYS = {
  all: ['auth'] as const,
  tokenStatus: () => [...AUTH_KEYS.all, 'tokenStatus'] as const,
  check: () => [...AUTH_KEYS.all, 'check'] as const,
} as const;

// Token状态接口
interface TokenStatus {
  isValid: boolean;
  needsRefresh: boolean;
  remainingTime: number;
  expiresAt?: string;
}

/**
 * 获取Token状态
 * 
 * 替换token-manager中的重复检查
 */
export function useTokenStatus() {
  return useQuery({
    queryKey: AUTH_KEYS.tokenStatus(),
    queryFn: async (): Promise<TokenStatus> => {
      const token = localStorage.getItem('auth-token');
      
      if (!token) {
        authLogger.debug('没有token，返回无效状态');
        return {
          isValid: false,
          needsRefresh: false,
          remainingTime: 0,
        };
      }

      authLogger.debug('检查token状态');
      const response = await apiClient.get('/auth/token-status');
      
      if (!response || typeof response !== 'object') {
        throw new Error('Token状态响应格式错误');
      }

      const status: TokenStatus = response;
      
      authLogger.debug('Token状态检查完成', {
        isValid: status.isValid,
        needsRefresh: status.needsRefresh,
        remainingTime: status.remainingTime,
      });

      return status;
    },
    staleTime: 2 * 60 * 1000,  // 2分钟内认为数据是新鲜的
    gcTime: 5 * 60 * 1000,     // 5分钟后清理缓存
    refetchInterval: 5 * 60 * 1000, // 每5分钟自动刷新
    retry: 2,
    retryDelay: 1000,
    // 只在有token时才启用查询
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('auth-token'),
  });
}

/**
 * 检查认证状态
 * 
 * 替换手动的/auth/check调用
 */
export function useAuthCheck() {
  return useQuery({
    queryKey: AUTH_KEYS.check(),
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      
      if (!token) {
        authLogger.debug('没有token，跳过认证检查');
        return { isAuthenticated: false };
      }

      authLogger.debug('执行认证检查');
      const response = await apiClient.get('/auth/check');
      
      authLogger.debug('认证检查完成', { isAuthenticated: !!response });
      return { isAuthenticated: !!response };
    },
    staleTime: 5 * 60 * 1000,  // 5分钟内认为数据是新鲜的
    gcTime: 10 * 60 * 1000,    // 10分钟后清理缓存
    retry: 1,
    retryDelay: 1000,
    // 只在有token时才启用查询
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('auth-token'),
  });
}