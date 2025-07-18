'use client';

import React, { useEffect, useRef } from 'react';
import { useEnhancedVersionCheck } from '@/hooks/useEnhancedVersionCheck';

interface AutoVersionCheckerProps {
  // 检查触发条件
  checkOnMount?: boolean;
  checkOnLogin?: boolean;
  checkOnFocus?: boolean;
  checkOnVisibilityChange?: boolean;
  
  // 检查间隔设置
  checkInterval?: number; // 毫秒
  minCheckInterval?: number; // 最小检查间隔，防止频繁检查
  
  // 网络状态检查
  checkOnNetworkReconnect?: boolean;
  
  // 调试选项
  debug?: boolean;
  
  // 回调函数
  onCheckTriggered?: (reason: string) => void;
  onCheckCompleted?: (hasUpdate: boolean) => void;
  onError?: (error: Error) => void;
}

export function AutoVersionChecker({
  checkOnMount = true,
  checkOnLogin = true,
  checkOnFocus = true,
  checkOnVisibilityChange = true,
  checkInterval = 24 * 60 * 60 * 1000, // 24小时
  minCheckInterval = 5 * 60 * 1000, // 5分钟
  checkOnNetworkReconnect = true,
  debug = false,
  onCheckTriggered,
  onCheckCompleted,
  onError
}: AutoVersionCheckerProps) {
  
  const { checkVersion, isChecking, hasUpdate, error } = useEnhancedVersionCheck({
    autoCheck: false, // 我们手动控制检查时机
    onError
  });

  // 引用
  const lastCheckTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  /**
   * 执行版本检查（带防抖）
   */
  const performCheck = async (reason: string) => {
    const now = Date.now();
    
    // 防止频繁检查
    if (now - lastCheckTimeRef.current < minCheckInterval) {
      if (debug) {
        console.log(`[AutoVersionChecker] 跳过检查 - 距离上次检查时间过短: ${reason}`);
      }
      return;
    }

    // 如果正在检查中，跳过
    if (isChecking) {
      if (debug) {
        console.log(`[AutoVersionChecker] 跳过检查 - 正在检查中: ${reason}`);
      }
      return;
    }

    try {
      if (debug) {
        console.log(`[AutoVersionChecker] 开始版本检查: ${reason}`);
      }

      if (onCheckTriggered) {
        onCheckTriggered(reason);
      }

      lastCheckTimeRef.current = now;
      await checkVersion();

      if (debug) {
        console.log(`[AutoVersionChecker] 版本检查完成: ${reason}`);
      }

    } catch (err) {
      if (debug) {
        console.error(`[AutoVersionChecker] 版本检查失败: ${reason}`, err);
      }
    }
  };

  // 组件挂载时检查
  useEffect(() => {
    if (checkOnMount && !isInitializedRef.current) {
      isInitializedRef.current = true;
      performCheck('组件挂载');
    }
  }, [checkOnMount]);

  // 定时检查
  useEffect(() => {
    if (checkInterval > 0) {
      intervalRef.current = setInterval(() => {
        performCheck('定时检查');
      }, checkInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [checkInterval]);

  // 用户登录检查
  useEffect(() => {
    if (!checkOnLogin) return;

    const handleStorageChange = (e: StorageEvent) => {
      // 监听token变化
      if (e.key === 'token') {
        if (e.newValue && !e.oldValue) {
          // 用户登录
          performCheck('用户登录');
        }
      }
    };

    // 监听localStorage变化
    window.addEventListener('storage', handleStorageChange);

    // 检查当前是否已登录
    const token = localStorage.getItem('token');
    if (token && isInitializedRef.current) {
      performCheck('检测到已登录状态');
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkOnLogin]);

  // 页面焦点检查
  useEffect(() => {
    if (!checkOnFocus) return;

    const handleFocus = () => {
      performCheck('页面获得焦点');
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkOnFocus]);

  // 页面可见性检查
  useEffect(() => {
    if (!checkOnVisibilityChange) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        performCheck('页面变为可见');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkOnVisibilityChange]);

  // 网络重连检查
  useEffect(() => {
    if (!checkOnNetworkReconnect) return;

    const handleOnline = () => {
      performCheck('网络重新连接');
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [checkOnNetworkReconnect]);

  // 检查完成回调
  useEffect(() => {
    if (onCheckCompleted && !isChecking && lastCheckTimeRef.current > 0) {
      onCheckCompleted(hasUpdate);
    }
  }, [isChecking, hasUpdate, onCheckCompleted]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 这个组件不渲染任何UI
  return null;
}

/**
 * 版本检查状态Hook
 * 提供版本检查的状态信息
 */
export function useVersionCheckStatus() {
  const { isChecking, hasUpdate, error, updateInfo } = useEnhancedVersionCheck({
    autoCheck: false
  });

  return {
    isChecking,
    hasUpdate,
    error,
    updateInfo,
    // 便捷的状态判断
    isIdle: !isChecking && !error,
    hasError: !!error,
    needsUpdate: hasUpdate && !!updateInfo,
    isForceUpdate: hasUpdate && updateInfo?.isForceUpdate
  };
}

/**
 * 版本检查调试Hook
 * 用于开发时调试版本检查功能
 */
export function useVersionCheckDebug() {
  const { checkVersion, clearError, getVersionStats } = useEnhancedVersionCheck({
    autoCheck: false
  });

  return {
    // 手动触发检查
    triggerCheck: () => checkVersion(),
    
    // 清除错误
    clearError,
    
    // 获取统计信息
    getStats: getVersionStats,
    
    // 清除本地数据
    clearLocalData: () => {
      localStorage.removeItem('versionCheck');
    },
    
    // 模拟网络错误
    simulateNetworkError: () => {
      // 这里可以添加模拟网络错误的逻辑
      console.warn('[VersionCheckDebug] 模拟网络错误功能需要在开发环境中实现');
    }
  };
}
