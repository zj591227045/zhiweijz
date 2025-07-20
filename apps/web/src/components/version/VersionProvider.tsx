'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';
import { useVersionCheck, getCurrentAppVersion, getCurrentPlatform } from '@/hooks/useVersionCheck';
import {
  VersionUpdateDialog,
  VersionCheckIndicator,
} from '@/components/version/VersionUpdateDialog';
import { VersionCheckResponse } from '@/lib/api/version';

interface VersionContextType {
  isChecking: boolean;
  updateInfo: VersionCheckResponse | null;
  error: string | null;
  checkVersion: () => Promise<void>;
  showUpdateDialog: boolean;
  setShowUpdateDialog: (show: boolean) => void;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

export function useVersion() {
  const context = useContext(VersionContext);
  if (!context) {
    throw new Error('useVersion must be used within a VersionProvider');
  }
  return context;
}

interface VersionProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  autoCheck?: boolean;
  checkInterval?: number;
}

export function VersionProvider({
  children,
  enabled = true,
  autoCheck = true,
  checkInterval = 24 * 60 * 60 * 1000, // 24小时
}: VersionProviderProps) {
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [forceUpdateDialog, setForceUpdateDialog] = useState(false);

  const platform = getCurrentPlatform();
  const { version, buildNumber } = getCurrentAppVersion();

  const handleUpdateAvailable = useCallback((updateInfo: VersionCheckResponse) => {
    setShowUpdateDialog(true);
  }, []);

  const handleForceUpdate = useCallback((updateInfo: VersionCheckResponse) => {
    setForceUpdateDialog(true);
    setShowUpdateDialog(true);
  }, []);

  const { isChecking, updateInfo, error, checkVersion, logUpdate, logSkip, clearError } =
    useVersionCheck({
      platform,
      currentVersion: version,
      currentBuildNumber: buildNumber,
      autoCheck: enabled && autoCheck,
      checkInterval,
      onUpdateAvailable: handleUpdateAvailable,
      onForceUpdate: handleForceUpdate,
    });

  const handleCloseDialog = useCallback(() => {
    if (!forceUpdateDialog) {
      setShowUpdateDialog(false);
    }
  }, [forceUpdateDialog]);

  const handleUpdate = useCallback(async () => {
    await logUpdate();
  }, [logUpdate]);

  const handleSkip = useCallback(async () => {
    await logSkip();
    setShowUpdateDialog(false);
    setForceUpdateDialog(false);
  }, [logSkip]);

  const contextValue: VersionContextType = {
    isChecking,
    updateInfo,
    error,
    checkVersion,
    showUpdateDialog,
    setShowUpdateDialog,
  };

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <VersionContext.Provider value={contextValue}>
      {children}

      {/* 版本检查指示器 */}
      <VersionCheckIndicator
        isChecking={isChecking}
        error={error}
        onRetry={() => {
          clearError();
          checkVersion();
        }}
      />

      {/* 版本更新对话框 */}
      {updateInfo && (
        <VersionUpdateDialog
          isOpen={showUpdateDialog}
          onClose={handleCloseDialog}
          updateInfo={updateInfo}
          onUpdate={handleUpdate}
          onSkip={handleSkip}
          platform={platform}
        />
      )}
    </VersionContext.Provider>
  );
}

// 手动检查版本的钩子
export function useManualVersionCheck() {
  const { checkVersion } = useVersion();

  return useCallback(async () => {
    await checkVersion();
  }, [checkVersion]);
}

// 获取版本信息的钩子
export function useVersionInfo() {
  const { updateInfo } = useVersion();
  const platform = getCurrentPlatform();
  const { version, buildNumber } = getCurrentAppVersion();

  return {
    currentVersion: version,
    currentBuildNumber: buildNumber,
    platform,
    latestVersion: updateInfo?.latestVersion,
    hasUpdate: updateInfo?.hasUpdate || false,
    isForceUpdate: updateInfo?.isForceUpdate || false,
  };
}
