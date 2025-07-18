/**
 * 增强的版本检查Hook
 * 提供完整的版本检查、更新管理和用户交互功能
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { versionCheckService, VersionCheckResult, UserAction } from '@/lib/services/versionCheckService';
import { VersionCheckResponse } from '@/lib/api/version';

export interface UseEnhancedVersionCheckOptions {
  // 是否启用自动检查
  autoCheck?: boolean;
  // 检查间隔（毫秒）
  checkInterval?: number;
  // 是否在页面可见时检查
  checkOnVisibilityChange?: boolean;
  // 是否在用户登录时检查
  checkOnLogin?: boolean;
  // 回调函数
  onUpdateAvailable?: (updateInfo: VersionCheckResponse) => void;
  onForceUpdate?: (updateInfo: VersionCheckResponse) => void;
  onCheckComplete?: (result: VersionCheckResult) => void;
  onError?: (error: Error) => void;
}

export interface UseEnhancedVersionCheckReturn {
  // 状态
  isChecking: boolean;
  hasUpdate: boolean;
  updateInfo: VersionCheckResponse | null;
  error: string | null;
  showUpdateDialog: boolean;
  
  // 操作方法
  checkVersion: () => Promise<void>;
  handleUserAction: (action: UserAction) => Promise<void>;
  setShowUpdateDialog: (show: boolean) => void;
  clearError: () => void;
  
  // 工具方法
  getCurrentPlatform: () => string;
  getCurrentVersion: () => { version: string; buildNumber: number };
  getVersionStats: () => any;
}

export function useEnhancedVersionCheck(
  options: UseEnhancedVersionCheckOptions = {}
): UseEnhancedVersionCheckReturn {
  const {
    autoCheck = true,
    checkInterval = 24 * 60 * 60 * 1000, // 24小时
    checkOnVisibilityChange = true,
    checkOnLogin = true,
    onUpdateAvailable,
    onForceUpdate,
    onCheckComplete,
    onError
  } = options;

  // 状态管理
  const [isChecking, setIsChecking] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<VersionCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  // 引用
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);

  /**
   * 执行版本检查
   */
  const checkVersion = useCallback(async () => {
    // 防止重复检查
    if (isChecking) return;
    
    // 防止频繁检查（最少间隔5分钟）
    const now = Date.now();
    if (now - lastCheckRef.current < 5 * 60 * 1000) {
      return;
    }

    setIsChecking(true);
    setError(null);
    lastCheckRef.current = now;

    try {
      const result = await versionCheckService.checkVersion();
      
      // 更新状态
      setHasUpdate(result.hasUpdate);
      setUpdateInfo(result.updateInfo || null);

      // 处理回调
      if (onCheckComplete) {
        onCheckComplete(result);
      }

      // 如果需要显示对话框
      if (result.shouldShowDialog && result.updateInfo) {
        setShowUpdateDialog(true);
        
        // 触发相应的回调
        if (result.updateInfo.isForceUpdate && onForceUpdate) {
          onForceUpdate(result.updateInfo);
        } else if (onUpdateAvailable) {
          onUpdateAvailable(result.updateInfo);
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '版本检查失败';
      setError(errorMessage);
      
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, onUpdateAvailable, onForceUpdate, onCheckComplete, onError]);

  /**
   * 处理用户操作
   */
  const handleUserAction = useCallback(async (action: UserAction) => {
    if (!updateInfo?.latestVersion) {
      throw new Error('No version information available');
    }

    try {
      const version = updateInfo.latestVersion.version;
      const versionId = updateInfo.latestVersion.id;

      // 处理用户操作
      await versionCheckService.handleUserAction(action, version, versionId);

      // 如果是更新操作，执行平台特定的更新
      if (action === 'update') {
        await versionCheckService.performUpdate(updateInfo);
      } else {
        // 其他操作关闭对话框
        setShowUpdateDialog(false);
        setHasUpdate(false);
        setUpdateInfo(null);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '操作失败';
      setError(errorMessage);

      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    }
  }, [updateInfo, onError]);

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 获取当前平台
   */
  const getCurrentPlatform = useCallback(() => {
    return versionCheckService.getCurrentPlatform();
  }, []);

  /**
   * 获取当前版本
   */
  const getCurrentVersion = useCallback(() => {
    return versionCheckService.getCurrentAppVersion();
  }, []);

  /**
   * 获取版本统计
   */
  const getVersionStats = useCallback(() => {
    return versionCheckService.getVersionCheckStats();
  }, []);

  // 自动检查效果
  useEffect(() => {
    if (!autoCheck) return;

    // 立即检查一次
    checkVersion();

    // 设置定时检查
    if (checkInterval > 0) {
      intervalRef.current = setInterval(checkVersion, checkInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoCheck, checkInterval, checkVersion]);

  // 页面可见性检查
  useEffect(() => {
    if (!checkOnVisibilityChange) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 页面变为可见时检查版本
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkOnVisibilityChange, checkVersion]);

  // 用户登录检查
  useEffect(() => {
    if (!checkOnLogin) return;

    const handleStorageChange = (e: StorageEvent) => {
      // 监听token变化，当用户登录时检查版本
      if (e.key === 'token' && e.newValue && !e.oldValue) {
        checkVersion();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkOnLogin, checkVersion]);

  // 清理效果
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // 状态
    isChecking,
    hasUpdate,
    updateInfo,
    error,
    showUpdateDialog,
    
    // 操作方法
    checkVersion,
    handleUserAction,
    setShowUpdateDialog,
    clearError,
    
    // 工具方法
    getCurrentPlatform,
    getCurrentVersion,
    getVersionStats
  };
}
