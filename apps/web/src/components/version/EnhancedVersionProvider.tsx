'use client';

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import {
  useEnhancedVersionCheck,
  UseEnhancedVersionCheckOptions,
} from '@/hooks/useEnhancedVersionCheck';
import { EnhancedVersionUpdateDialog } from './EnhancedVersionUpdateDialog';
import { VersionCheckIndicator, NetworkStatusIndicator } from './VersionCheckIndicator';
import { VersionCheckResponse } from '@/lib/api/version';
import { UserAction } from '@/lib/services/versionCheckService';

interface EnhancedVersionContextType {
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

const EnhancedVersionContext = createContext<EnhancedVersionContextType | undefined>(undefined);

export function useEnhancedVersion() {
  const context = useContext(EnhancedVersionContext);
  if (context === undefined) {
    throw new Error('useEnhancedVersion must be used within an EnhancedVersionProvider');
  }
  return context;
}

interface EnhancedVersionProviderProps {
  children: React.ReactNode;
  // 版本检查选项
  enabled?: boolean;
  autoCheck?: boolean;
  checkInterval?: number;
  checkOnVisibilityChange?: boolean;
  checkOnLogin?: boolean;

  // UI选项
  showIndicator?: boolean;
  showNetworkStatus?: boolean;
  indicatorPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

  // 回调函数
  onUpdateAvailable?: (updateInfo: VersionCheckResponse) => void;
  onForceUpdate?: (updateInfo: VersionCheckResponse) => void;
  onUpdateComplete?: () => void;
  onError?: (error: Error) => void;
}

export function EnhancedVersionProvider({
  children,
  enabled = true,
  autoCheck = true,
  checkInterval = 24 * 60 * 60 * 1000, // 24小时
  checkOnVisibilityChange = true,
  checkOnLogin = true,
  showIndicator = true,
  showNetworkStatus = true,
  indicatorPosition = 'top-right',
  onUpdateAvailable,
  onForceUpdate,
  onUpdateComplete,
  onError,
}: EnhancedVersionProviderProps) {
  // 版本检查选项
  const versionCheckOptions: UseEnhancedVersionCheckOptions = {
    autoCheck: enabled && autoCheck,
    checkInterval,
    checkOnVisibilityChange,
    checkOnLogin,
    onUpdateAvailable,
    onForceUpdate,
    onError,
  };

  // 使用增强的版本检查Hook
  const {
    isChecking,
    hasUpdate,
    updateInfo,
    error,
    showUpdateDialog,
    checkVersion,
    handleUserAction: originalHandleUserAction,
    setShowUpdateDialog,
    clearError,
    getCurrentPlatform,
    getCurrentVersion,
    getVersionStats,
  } = useEnhancedVersionCheck(versionCheckOptions);

  // 包装用户操作处理，添加完成回调
  const handleUserAction = useCallback(
    async (action: UserAction) => {
      await originalHandleUserAction(action);

      // 如果是更新操作且有完成回调
      if (action === 'update' && onUpdateComplete) {
        onUpdateComplete();
      }
    },
    [originalHandleUserAction, onUpdateComplete],
  );

  // 获取指示器位置样式
  const getIndicatorPositionClass = () => {
    switch (indicatorPosition) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-right':
      default:
        return 'top-4 right-4';
    }
  };

  // 上下文值
  const contextValue: EnhancedVersionContextType = {
    isChecking,
    hasUpdate,
    updateInfo,
    error,
    showUpdateDialog,
    checkVersion,
    handleUserAction,
    setShowUpdateDialog,
    clearError,
    getCurrentPlatform,
    getCurrentVersion,
    getVersionStats,
  };

  // 如果未启用，只渲染子组件
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <EnhancedVersionContext.Provider value={contextValue}>
      {children}

      {/* 版本检查状态指示器 */}
      {showIndicator && (
        <VersionCheckIndicator
          isChecking={isChecking}
          error={error}
          onRetry={checkVersion}
          onDismiss={clearError}
          className={getIndicatorPositionClass()}
        />
      )}

      {/* 网络状态指示器 */}
      {showNetworkStatus && <NetworkStatusIndicator />}

      {/* 版本更新对话框 */}
      {updateInfo && (
        <EnhancedVersionUpdateDialog
          isOpen={showUpdateDialog}
          onClose={() => setShowUpdateDialog(false)}
          updateInfo={updateInfo}
          onUserAction={handleUserAction}
          platform={getCurrentPlatform() as 'web' | 'ios' | 'android'}
        />
      )}
    </EnhancedVersionContext.Provider>
  );
}

/**
 * 手动版本检查Hook
 * 用于在特定场景下手动触发版本检查
 */
export function useManualVersionCheck() {
  const { checkVersion } = useEnhancedVersion();

  return useCallback(async () => {
    await checkVersion();
  }, [checkVersion]);
}

/**
 * 版本信息Hook
 * 获取当前版本和更新信息
 */
export function useVersionInfo() {
  const { hasUpdate, updateInfo, getCurrentPlatform, getCurrentVersion, getVersionStats } =
    useEnhancedVersion();

  const currentVersion = getCurrentVersion();
  const platform = getCurrentPlatform();
  const stats = getVersionStats();

  return {
    // 当前版本信息
    currentVersion: currentVersion.version,
    currentBuildNumber: currentVersion.buildNumber,
    platform,

    // 更新信息
    hasUpdate,
    latestVersion: updateInfo?.latestVersion,
    isForceUpdate: updateInfo?.isForceUpdate || false,
    updateMessage: updateInfo?.updateMessage,

    // 统计信息
    skippedVersionsCount: stats.skippedVersionsCount,
    hasPostponedVersion: stats.hasPostponedVersion,
    lastCheckTime: stats.lastCheckTime,
  };
}

/**
 * 版本检查控制Hook
 * 提供版本检查的控制方法
 */
export function useVersionCheckControl() {
  const { checkVersion, setShowUpdateDialog, clearError, isChecking, error } = useEnhancedVersion();

  return {
    // 状态
    isChecking,
    error,

    // 控制方法
    checkVersion,
    showUpdateDialog: () => setShowUpdateDialog(true),
    hideUpdateDialog: () => setShowUpdateDialog(false),
    clearError,
  };
}
