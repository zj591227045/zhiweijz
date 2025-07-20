/**
 * Token监控Hook
 * 提供token状态监控和自动刷新功能
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { tokenManager } from '@/lib/token-manager';
import { useAuthStore } from '@/store/auth-store';

interface UseTokenMonitorOptions {
  /** 是否在token失效时自动跳转到登录页 */
  autoRedirect?: boolean;
  /** 是否启用监控（默认true） */
  enabled?: boolean;
  /** token失效时的回调 */
  onTokenInvalid?: () => void;
  /** token刷新成功时的回调 */
  onTokenRefreshed?: () => void;
}

interface TokenMonitorState {
  /** 是否正在监控 */
  isMonitoring: boolean;
  /** token是否有效 */
  isTokenValid: boolean;
  /** 是否正在刷新token */
  isRefreshing: boolean;
  /** 手动刷新token */
  refreshToken: () => Promise<boolean>;
  /** 手动检查token状态 */
  checkTokenStatus: () => Promise<boolean>;
}

export function useTokenMonitor(options: UseTokenMonitorOptions = {}): TokenMonitorState {
  const { autoRedirect = true, enabled = true, onTokenInvalid, onTokenRefreshed } = options;

  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // token状态变化处理
  const handleTokenStatusChange = useCallback(
    (isValid: boolean) => {
      setIsTokenValid(isValid);

      if (!isValid) {
        console.log('🚨 Token失效，执行清理操作');

        // 检查当前是否在登录页面，如果是则不执行清理操作
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/auth/')) {
          console.log('📍 当前在认证页面，跳过token失效处理');
          return;
        }

        // 执行用户自定义回调
        if (onTokenInvalid) {
          onTokenInvalid();
        }

        // 清除认证状态
        logout();

        // 自动跳转到登录页
        if (autoRedirect && typeof window !== 'undefined') {
          router.push('/auth/login');
        }
      }
    },
    [onTokenInvalid, logout, autoRedirect, router],
  );

  // 手动刷新token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    setIsRefreshing(true);
    try {
      const success = await tokenManager.refreshToken();
      if (success && onTokenRefreshed) {
        onTokenRefreshed();
      }
      return success;
    } finally {
      setIsRefreshing(false);
    }
  }, [onTokenRefreshed]);

  // 手动检查token状态
  const checkTokenStatus = useCallback(async (): Promise<boolean> => {
    return await tokenManager.checkNow();
  }, []);

  // 启动/停止监控
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      if (isMonitoring) {
        tokenManager.stopMonitoring();
        tokenManager.removeListener(handleTokenStatusChange);
        setIsMonitoring(false);
      }
      return;
    }

    // 添加监听器
    tokenManager.addListener(handleTokenStatusChange);

    // 启动监控
    tokenManager.startMonitoring();
    setIsMonitoring(true);

    return () => {
      tokenManager.removeListener(handleTokenStatusChange);
      tokenManager.stopMonitoring();
      setIsMonitoring(false);
    };
  }, [enabled, isAuthenticated, handleTokenStatusChange, isMonitoring]);

  // 页面可见性变化时重新检查token
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面重新可见时检查token状态
        tokenManager.checkNow();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, isAuthenticated]);

  return {
    isMonitoring,
    isTokenValid,
    isRefreshing,
    refreshToken,
    checkTokenStatus,
  };
}

/**
 * 简化版Hook，仅用于自动监控
 */
export function useAutoTokenMonitor(enabled: boolean = true): void {
  useTokenMonitor({ enabled, autoRedirect: true });
}
