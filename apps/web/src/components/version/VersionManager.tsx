import React, { useEffect, useState } from 'react';
import { VersionUpdateModal } from '@/components/version/VersionUpdateModal';
import { useVersionCheck } from '@/hooks/useVersionCheck';

interface VersionManagerProps {
  currentVersion?: string;
  currentBuildNumber?: number;
  isAdmin?: boolean;
  autoCheck?: boolean;
  checkInterval?: number; // 检查间隔(毫秒)
  onVersionChecked?: (hasUpdate: boolean) => void;
}

export function VersionManager({
  currentVersion = '1.0.0',
  currentBuildNumber = 1,
  isAdmin = false,
  autoCheck = true,
  checkInterval = 60 * 60 * 1000, // 默认1小时
  onVersionChecked,
}: VersionManagerProps) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const {
    isChecking,
    hasUpdate,
    latestVersion,
    updateMessage,
    userStatus,
    error,
    checkVersion,
    setUserVersionStatus,
    clearError,
  } = useVersionCheck();

  // 获取当前平台
  const getCurrentPlatform = (): 'web' | 'ios' | 'android' => {
    if (typeof window === 'undefined') return 'web';

    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    return 'web';
  };

  // 检查版本更新
  const performVersionCheck = async () => {
    const platform = getCurrentPlatform();
    await checkVersion({
      platform,
      currentVersion,
      currentBuildNumber,
    });
  };

  // 处理版本更新操作
  const handleVersionAction = async (action: 'update' | 'postpone' | 'ignore') => {
    try {
      if (action === 'update') {
        // 如果是更新操作，先记录更新日志
        const token = localStorage.getItem('token');
        if (token && latestVersion) {
          // 这里可以添加更新日志记录
          console.log('用户选择立即更新');
        }
      } else {
        // 设置用户版本状态
        await setUserVersionStatus(action);
      }

      if (action !== 'update') {
        setShowUpdateModal(false);
      }
    } catch (err) {
      console.error('版本操作失败:', err);
    }
  };

  // 自动检查版本
  useEffect(() => {
    if (!autoCheck) return;

    // 立即检查一次
    performVersionCheck();

    // 设置定时检查
    const interval = setInterval(performVersionCheck, checkInterval);

    return () => clearInterval(interval);
  }, [autoCheck, checkInterval, currentVersion, currentBuildNumber]);

  // 当版本检查完成时触发回调
  useEffect(() => {
    if (onVersionChecked) {
      onVersionChecked(hasUpdate);
    }
  }, [hasUpdate, onVersionChecked]);

  // 当发现更新时显示模态框
  useEffect(() => {
    if (hasUpdate && latestVersion) {
      // 检查是否为强制更新或者用户还未处理过此版本
      const shouldShowModal =
        latestVersion.isForceUpdate || !userStatus || userStatus.status === 'PENDING';

      if (shouldShowModal) {
        setShowUpdateModal(true);
      }
    }
  }, [hasUpdate, latestVersion, userStatus]);

  // 清除错误
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return (
    <>
      {/* 版本更新模态框 */}
      {showUpdateModal && latestVersion && (
        <VersionUpdateModal
          open={showUpdateModal}
          onOpenChange={setShowUpdateModal}
          version={latestVersion}
          currentVersion={currentVersion}
          isAdmin={isAdmin}
          onAction={handleVersionAction}
        />
      )}

      {/* 错误提示 */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <span className="text-sm">{error}</span>
            <button onClick={clearError} className="text-white hover:text-red-200">
              ×
            </button>
          </div>
        </div>
      )}

      {/* 检查状态指示器(可选) */}
      {isChecking && (
        <div className="fixed bottom-4 left-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">检查更新中...</span>
          </div>
        </div>
      )}
    </>
  );
}

// 手动版本检查组件
export function ManualVersionCheck({
  currentVersion = '1.0.0',
  currentBuildNumber = 1,
  isAdmin = false,
  onUpdateAvailable,
  children,
}: {
  currentVersion?: string;
  currentBuildNumber?: number;
  isAdmin?: boolean;
  onUpdateAvailable?: (version: any) => void;
  children: React.ReactNode;
}) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const { isChecking, hasUpdate, latestVersion, setUserVersionStatus, checkVersion } =
    useVersionCheck();

  const handleManualCheck = async () => {
    const platform =
      typeof window !== 'undefined'
        ? navigator.userAgent.toLowerCase().includes('android')
          ? 'android'
          : navigator.userAgent.toLowerCase().includes('iphone') ||
              navigator.userAgent.toLowerCase().includes('ipad')
            ? 'ios'
            : 'web'
        : 'web';

    await checkVersion({
      platform,
      currentVersion,
      currentBuildNumber,
    });

    if (hasUpdate && latestVersion) {
      setShowUpdateModal(true);
      if (onUpdateAvailable) {
        onUpdateAvailable(latestVersion);
      }
    }
  };

  const handleVersionAction = async (action: 'update' | 'postpone' | 'ignore') => {
    try {
      if (action !== 'update') {
        await setUserVersionStatus(action);
      }
      setShowUpdateModal(false);
    } catch (err) {
      console.error('版本操作失败:', err);
    }
  };

  return (
    <>
      <div
        onClick={handleManualCheck}
        className={isChecking ? 'pointer-events-none opacity-50' : ''}
      >
        {children}
      </div>

      {showUpdateModal && latestVersion && (
        <VersionUpdateModal
          open={showUpdateModal}
          onOpenChange={setShowUpdateModal}
          version={latestVersion}
          currentVersion={currentVersion}
          isAdmin={isAdmin}
          onAction={handleVersionAction}
        />
      )}
    </>
  );
}
