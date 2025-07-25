'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getCurrentAppVersion, getCurrentPlatform, getPlatformDisplayName } from '@/utils/version-utils';
import { versionApi } from '@/lib/api/version';

interface VersionUpdateProps {
  className?: string;
  isAdmin?: boolean;
}

export function VersionUpdate({ className, isAdmin = false }: VersionUpdateProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [currentBuildNumber, setCurrentBuildNumber] = useState<number>(0);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [platform, setPlatform] = useState<'web' | 'ios' | 'android'>('web');

  useEffect(() => {
    // 获取当前版本信息
    if (typeof window !== 'undefined') {
      const detectedPlatform = getCurrentPlatform();
      setPlatform(detectedPlatform);

      if (window.Capacitor && window.Capacitor.Plugins?.App) {
        // Capacitor 环境，获取真实的应用版本信息
        window.Capacitor.Plugins.App.getInfo().then((info: any) => {
          setCurrentVersion(info.version);
          setCurrentBuildNumber(parseInt(info.build || '1'));
        });
      } else {
        // 网页环境，使用环境变量中的版本信息
        const { version, buildNumber } = getCurrentAppVersion();
        setCurrentVersion(version);
        setCurrentBuildNumber(buildNumber);
      }
    }
  }, []);

  // 处理版本检查
  const handleCheckUpdate = async () => {
    setIsChecking(true);
    try {
      // 使用统一的版本API
      const result = await versionApi.checkVersion({
        platform: platform,
        currentVersion: currentVersion,
        currentBuildNumber: currentBuildNumber
      });

      setUpdateInfo(result);
      setHasUpdate(result?.hasUpdate || false);

      // 给用户明确的反馈
      if (result?.hasUpdate) {
        // 有更新时不需要额外提示，UI会显示更新信息
      } else {
        // 没有更新时给用户提示
        alert(result?.updateMessage || '当前已是最新版本');
      }
    } catch (error) {
      console.error('检查更新失败:', error);
      alert(error instanceof Error ? error.message : '检查更新失败');
    } finally {
      setIsChecking(false);
    }
  };

  // 处理更新
  const handleUpdate = () => {
    if (!updateInfo?.latestVersion) return;

    const version = updateInfo.latestVersion;
    
    if (platform === 'web') {
      // 网页版刷新页面
      window.location.reload();
    } else if (platform === 'ios' && version.appStoreUrl) {
      // iOS跳转到App Store
      window.open(version.appStoreUrl, '_blank');
    } else if (platform === 'android' && version.downloadUrl) {
      // Android下载APK
      window.open(version.downloadUrl, '_blank');
    }
  };

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">版本更新</h3>
          <div className="mt-1 text-sm text-gray-500">
            <div>当前版本: {currentVersion} ({currentBuildNumber})</div>
            <div className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 mt-1">
              {getPlatformDisplayName(platform)}
            </div>
            {isAdmin && (
              <div className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 mt-1 ml-2">
                管理端
              </div>
            )}
          </div>
          
          {hasUpdate && updateInfo?.latestVersion && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-900">
                发现新版本: {updateInfo.latestVersion.version}
              </div>
              {updateInfo.latestVersion.releaseNotes && (
                <div className="mt-1 text-xs text-blue-800">
                  {updateInfo.latestVersion.releaseNotes}
                </div>
              )}
              {updateInfo.latestVersion.isForceUpdate && (
                <div className="mt-1 text-xs text-red-600 font-medium">
                  ⚠️ 强制更新
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="ml-4">
          {hasUpdate ? (
            <Button
              onClick={handleUpdate}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              立即更新
            </Button>
          ) : (
            <Button
              onClick={handleCheckUpdate}
              disabled={isChecking}
              variant="outline"
            >
              {isChecking ? '检查中...' : '检查更新'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}