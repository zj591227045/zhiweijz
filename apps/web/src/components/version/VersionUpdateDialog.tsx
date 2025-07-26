'use client';

import React, { useState } from 'react';
import { VersionCheckResponse } from '@/lib/api/version';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Download, AlertTriangle, Info } from 'lucide-react';

interface VersionUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: VersionCheckResponse;
  onUpdate: () => void;
  onSkip: () => void;
  platform: 'web' | 'ios' | 'android';
}

export function VersionUpdateDialog({
  isOpen,
  onClose,
  updateInfo,
  onUpdate,
  onSkip,
  platform,
}: VersionUpdateDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!updateInfo.hasUpdate || !updateInfo.latestVersion) {
    return null;
  }

  const { latestVersion, isForceUpdate, updateMessage } = updateInfo;

  const handleUpdate = async () => {
    setIsUpdating(true);

    try {
      await onUpdate();

      // 根据平台执行不同的更新逻辑
      if (platform === 'web') {
        // Web平台刷新页面
        window.location.reload();
      } else if (platform === 'ios' && latestVersion.appStoreUrl) {
        // iOS平台打开App Store
        window.open(latestVersion.appStoreUrl, '_blank');
      } else if (platform === 'android' && latestVersion.downloadUrl) {
        // Android平台下载APK
        window.open(latestVersion.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('更新失败:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkip = async () => {
    await onSkip();
    onClose();
  };

  const getUpdateButtonText = () => {
    switch (platform) {
      case 'web':
        return '立即更新';
      case 'ios':
        return '前往App Store';
      case 'android':
        return '下载更新';
      default:
        return '立即更新';
    }
  };

  const getUpdateIcon = () => {
    switch (platform) {
      case 'web':
        return <Download className="w-4 h-4" />;
      case 'ios':
      case 'android':
        return <ExternalLink className="w-4 h-4" />;
      default:
        return <Download className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={!isForceUpdate ? onClose : undefined}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isForceUpdate ? (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            ) : (
              <Info className="w-5 h-5 text-blue-500" />
            )}
            {isForceUpdate ? '需要更新' : '发现新版本'}
          </DialogTitle>
          <DialogDescription>
            {updateMessage || `发现新版本 ${latestVersion.version}，建议立即更新以获得最佳体验。`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 版本信息 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">最新版本</span>
              <Badge variant="outline">
                {latestVersion.version} (Build {latestVersion.buildNumber})
              </Badge>
            </div>

            {isForceUpdate && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span>此更新为强制更新</span>
              </div>
            )}

            <div className="text-sm text-gray-600">
              发布时间: {new Date(latestVersion.publishedAt).toLocaleDateString('zh-CN')}
            </div>
          </div>

          {/* 更新说明 */}
          {latestVersion.releaseNotes && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">更新内容</h4>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {latestVersion.releaseNotes}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex-1"
              variant={isForceUpdate ? 'destructive' : 'default'}
            >
              {getUpdateIcon()}
              {isUpdating ? '更新中...' : getUpdateButtonText()}
            </Button>

            {!isForceUpdate && (
              <Button onClick={handleSkip} variant="outline" className="flex-1">
                稍后提醒
              </Button>
            )}
          </div>

          {/* 平台特定提示 */}
          {platform === 'android' && latestVersion.downloadUrl && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              下载更新包后，请允许安装未知来源应用
            </div>
          )}

          {platform === 'ios' && latestVersion.appStoreUrl && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">将跳转到App Store进行更新</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 版本检查状态组件
interface VersionCheckIndicatorProps {
  isChecking: boolean;
  error: string | null;
  onRetry: () => void;
}

export function VersionCheckIndicator({ isChecking, error, onRetry }: VersionCheckIndicatorProps) {
  if (!isChecking && !error) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isChecking && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-600 dark:text-gray-300">检查更新中...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-200">{error}</span>
          <Button onClick={onRetry} variant="outline" size="sm" className="ml-2">
            重试
          </Button>
        </div>
      )}
    </div>
  );
}
