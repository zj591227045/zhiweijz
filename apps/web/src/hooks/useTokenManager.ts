/**
 * Token管理hook - React Query版本
 * 
 * 替换原有的token-manager，使用React Query管理token状态
 */

'use client';

import { useTokenStatus } from './queries/useAuthQueries';
import { useAuthStore } from '@/store/auth-store';
import { createLogger } from '@/lib/logger';
import { useEffect } from 'react';

const tokenLogger = createLogger('TokenManager');

/**
 * Token管理hook
 * 
 * 使用React Query替代手动的token检查和刷新
 */
export function useTokenManager() {
  const { logout } = useAuthStore();
  
  const {
    data: tokenStatus,
    isLoading,
    error,
    refetch: checkTokenStatus,
  } = useTokenStatus();

  // 处理token需要刷新的情况
  useEffect(() => {
    if (tokenStatus?.needsRefresh && tokenStatus.isValid) {
      tokenLogger.info('Token需要刷新', {
        remainingTime: tokenStatus.remainingTime,
      });
      
      // TODO: 实现token刷新逻辑
      // 这里可以调用refresh token API
    }
  }, [tokenStatus?.needsRefresh, tokenStatus?.isValid]);

  // 处理token无效的情况
  useEffect(() => {
    if (tokenStatus && !tokenStatus.isValid) {
      tokenLogger.warn('Token无效，执行登出');
      logout();
    }
  }, [tokenStatus?.isValid, logout]);

  // 处理查询错误
  useEffect(() => {
    if (error) {
      tokenLogger.error('Token状态检查失败', error);
      // 如果是401错误，说明token已失效
      if (error instanceof Error && error.message.includes('401')) {
        logout();
      }
    }
  }, [error, logout]);

  return {
    // Token状态
    tokenStatus,
    isLoading,
    error,
    
    // 操作方法
    checkTokenStatus,
    
    // 兼容性方法（保持与原token-manager相同的接口）
    checkNow: async (): Promise<boolean> => {
      try {
        const result = await checkTokenStatus();
        return !!result.data?.isValid;
      } catch (error) {
        tokenLogger.error('手动检查token失败', error);
        return false;
      }
    },
    
    getCurrentStatus: () => tokenStatus,
    
    // React Query版本不需要手动启动/停止
    start: () => {
      tokenLogger.debug('React Query版本自动管理，不需要手动启动');
    },
    
    stop: () => {
      tokenLogger.debug('React Query版本自动管理，不需要手动停止');
    },
  };
}