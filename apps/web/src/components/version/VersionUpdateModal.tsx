import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, X, Download, Clock, EyeOff } from 'lucide-react';

interface VersionUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: {
    id: string;
    version: string;
    buildNumber: number;
    versionCode: number;
    releaseNotes?: string;
    downloadUrl?: string;
    appStoreUrl?: string;
    detailUrl?: string;
    isForceUpdate: boolean;
    platform: 'WEB' | 'IOS' | 'ANDROID';
  };
  currentVersion?: string;
  isAdmin?: boolean;
  onAction: (action: 'update' | 'postpone' | 'ignore') => void;
}

export function VersionUpdateModal({
  open,
  onOpenChange,
  version,
  currentVersion,
  isAdmin = false,
  onAction,
}: VersionUpdateModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (action: 'update' | 'postpone' | 'ignore') => {
    setIsProcessing(true);
    try {
      await onAction(action);
      if (action !== 'update') {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Version action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getUpdateTitle = () => {
    if (version.isForceUpdate) {
      return `🔄 强制更新至 ${version.version}`;
    }
    if (isAdmin) {
      return `📋 管理端更新 - ${version.version}`;
    }
    return `🆕 发现新版本 ${version.version}`;
  };

  const getUpdateDescription = () => {
    if (version.isForceUpdate) {
      return '此版本包含重要的安全更新和错误修复，必须立即更新。';
    }
    if (isAdmin) {
      return '管理端发现新版本，建议及时更新以获得最新功能和安全修复。';
    }
    return '新版本已发布，建议更新以获得最新功能和改进。';
  };

  const getDownloadUrl = () => {
    if (version.platform === 'IOS' && version.appStoreUrl) {
      return version.appStoreUrl;
    }
    if (version.platform === 'ANDROID' && version.downloadUrl) {
      return version.downloadUrl;
    }
    if (version.platform === 'WEB') {
      return window.location.origin; // 网页版通过刷新页面更新
    }
    return null;
  };

  const handleUpdate = () => {
    const downloadUrl = getDownloadUrl();

    if (version.platform === 'WEB') {
      // 网页版通过刷新页面更新
      handleAction('update');
      window.location.reload();
    } else if (downloadUrl) {
      // 移动端打开下载链接
      window.open(downloadUrl, '_blank');
      handleAction('update');
    }
  };

  return (
    <Dialog open={open} onOpenChange={version.isForceUpdate ? undefined : onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">{getUpdateTitle()}</DialogTitle>
            {!version.isForceUpdate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <DialogDescription className="text-base">{getUpdateDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 版本信息 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">版本信息</span>
              <span className="text-xs text-gray-500">
                {version.platform} · Build {version.buildNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">当前版本: {currentVersion || '未知'}</span>
              <span className="text-sm font-semibold text-blue-600">
                最新版本: {version.version}
              </span>
            </div>
          </div>

          {/* 更新说明 */}
          {version.releaseNotes && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">更新内容</h4>
              <div className="text-sm text-blue-800 whitespace-pre-wrap">
                {version.releaseNotes}
              </div>

              {/* 详细更新情况链接 */}
              {version.detailUrl && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <Button
                    onClick={() => window.open(version.detailUrl, '_blank')}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    查看详细更新情况
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col gap-3">
            {/* 立即更新按钮 */}
            <Button
              onClick={handleUpdate}
              disabled={isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  处理中...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {version.platform === 'WEB' ? (
                    <Download className="h-4 w-4" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  立即更新
                </div>
              )}
            </Button>

            {/* 非强制更新时显示其他选项 */}
            {!version.isForceUpdate && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleAction('postpone')}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  稍后提醒
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAction('ignore')}
                  disabled={isProcessing}
                  className="flex-1 text-gray-600"
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  跳过此版本
                </Button>
              </div>
            )}
          </div>

          {/* 强制更新提示 */}
          {version.isForceUpdate && (
            <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
              <p className="text-sm text-orange-800 text-center">
                ⚠️ 此版本为强制更新，必须更新后才能继续使用应用
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
