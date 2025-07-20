import { useState, useCallback, useEffect } from 'react';
import { versionApi, VersionCheckRequest, VersionCheckResponse } from '@/lib/api/version';

interface UseVersionCheckReturn {
  isChecking: boolean;
  hasUpdate: boolean;
  latestVersion: VersionCheckResponse['latestVersion'];
  updateMessage: string;
  userStatus: VersionCheckResponse['userStatus'];
  error: string | null;
  checkVersion: (params: VersionCheckRequest) => Promise<void>;
  setUserVersionStatus: (action: 'postpone' | 'ignore' | 'update') => Promise<void>;
  clearError: () => void;
}

export function useVersionCheck(): UseVersionCheckReturn {
  const [isChecking, setIsChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<VersionCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 检查版本更新
  const checkVersion = useCallback(
    async (params: VersionCheckRequest) => {
      if (isChecking) return;

      setIsChecking(true);
      setError(null);

      try {
        const result = await versionApi.checkVersion(params);
        setUpdateInfo(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '版本检查失败';
        setError(errorMessage);
        console.error('版本检查失败:', err);
      } finally {
        setIsChecking(false);
      }
    },
    [isChecking],
  );

  // 设置用户版本状态
  const setUserVersionStatus = useCallback(
    async (action: 'postpone' | 'ignore' | 'update') => {
      if (!updateInfo?.latestVersion?.id) {
        throw new Error('无法获取版本信息');
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('用户未登录');
        }

        // 根据平台确定
        const platform =
          window.location.hostname === 'localhost'
            ? 'web'
            : /android/i.test(navigator.userAgent)
              ? 'android'
              : /iphone|ipad/i.test(navigator.userAgent)
                ? 'ios'
                : 'web';

        const postponedUntil =
          action === 'postpone' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined; // 推迟7天

        await versionApi.setUserVersionStatus(
          {
            platform,
            appVersionId: updateInfo.latestVersion.id,
            status: action,
            postponedUntil,
          },
          token,
        );

        // 更新本地状态
        setUpdateInfo((prev) =>
          prev
            ? {
                ...prev,
                hasUpdate: action === 'ignore' ? false : prev.hasUpdate,
                userStatus: {
                  id: 'temp',
                  userId: 'temp',
                  platform: platform.toUpperCase() as any,
                  appVersionId: updateInfo.latestVersion.id,
                  version: updateInfo.latestVersion.version,
                  versionCode: updateInfo.latestVersion.versionCode,
                  status: action.toUpperCase() as any,
                  postponedUntil: postponedUntil || null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              }
            : null,
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '设置版本状态失败';
        setError(errorMessage);
        console.error('设置版本状态失败:', err);
        throw err;
      }
    },
    [updateInfo],
  );

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isChecking,
    hasUpdate: updateInfo?.hasUpdate || false,
    latestVersion: updateInfo?.latestVersion,
    updateMessage: updateInfo?.updateMessage || '',
    userStatus: updateInfo?.userStatus,
    error,
    checkVersion,
    setUserVersionStatus,
    clearError,
  };
}
