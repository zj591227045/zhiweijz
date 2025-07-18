'use client';

import React, { useState } from 'react';
import { VersionCheckResponse } from '@/lib/api/version';
import { UserAction } from '@/lib/services/versionCheckService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  ExternalLink,
  AlertTriangle,
  Info,
  Clock,
  EyeOff,
  Smartphone,
  Globe,
  Apple,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface EnhancedVersionUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: VersionCheckResponse;
  onUserAction: (action: UserAction) => Promise<void>;
  platform: 'web' | 'ios' | 'android';
}

export function EnhancedVersionUpdateDialog({
  isOpen,
  onClose,
  updateInfo,
  onUserAction,
  platform
}: EnhancedVersionUpdateDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<UserAction | null>(null);
  const [showFullReleaseNotes, setShowFullReleaseNotes] = useState(false);

  const { latestVersion, isForceUpdate, updateMessage } = updateInfo;

  if (!latestVersion) {
    return null;
  }

  /**
   * 处理用户操作
   */
  const handleAction = async (action: UserAction) => {
    setIsProcessing(true);
    setProcessingAction(action);

    try {
      await onUserAction(action);
      
      // 如果不是更新操作，关闭对话框
      if (action !== 'update') {
        onClose();
      }
    } catch (error) {
      console.error('Action failed:', error);
      // 这里可以显示错误提示
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  /**
   * 获取平台图标
   */
  const getPlatformIcon = () => {
    switch (platform) {
      case 'ios':
        return <Apple className="w-4 h-4" />;
      case 'android':
        return <Smartphone className="w-4 h-4" />;
      case 'web':
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  /**
   * 获取平台名称
   */
  const getPlatformName = () => {
    switch (platform) {
      case 'ios':
        return 'iOS';
      case 'android':
        return 'Android';
      case 'web':
      default:
        return 'Web';
    }
  };

  /**
   * 获取更新按钮文本
   */
  const getUpdateButtonText = () => {
    switch (platform) {
      case 'ios':
        return '前往 App Store';
      case 'android':
        return '下载更新包';
      case 'web':
      default:
        return '立即更新';
    }
  };

  /**
   * 获取更新按钮文本（简化版，用于小屏幕）
   */
  const getUpdateButtonTextShort = () => {
    switch (platform) {
      case 'ios':
        return 'App Store';
      case 'android':
        return '下载更新';
      case 'web':
      default:
        return '立即更新';
    }
  };

  /**
   * 获取更新按钮图标
   */
  const getUpdateButtonIcon = () => {
    switch (platform) {
      case 'ios':
        return <ExternalLink className="w-4 h-4" />;
      case 'android':
        return <Download className="w-4 h-4" />;
      case 'web':
      default:
        return <Download className="w-4 h-4" />;
    }
  };

  /**
   * 获取更新说明
   */
  const getUpdateInstructions = () => {
    switch (platform) {
      case 'ios':
        return '点击按钮将跳转到 App Store 进行更新';
      case 'android':
        return '下载完成后，请允许安装未知来源应用';
      case 'web':
      default:
        return '更新将自动刷新页面以应用最新版本';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={!isForceUpdate ? onClose : undefined}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            {isForceUpdate ? (
              <>
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-red-600">需要更新</span>
              </>
            ) : (
              <>
                <Info className="w-5 h-5 text-blue-500" />
                <span className="text-blue-600">发现新版本</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {updateMessage || `发现新版本 ${latestVersion.version}，建议立即更新以获得最佳体验。`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 版本信息卡片 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {getPlatformIcon()}
                <span className="text-sm font-medium text-gray-700">{getPlatformName()} 版本</span>
              </div>
              {isForceUpdate && (
                <Badge variant="destructive" className="text-xs">
                  强制更新
                </Badge>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">最新版本</span>
                <span className="font-semibold text-blue-600">{latestVersion.version}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">版本号</span>
                <span className="font-mono text-sm text-gray-800">{latestVersion.versionCode}</span>
              </div>
              {latestVersion.publishedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">发布时间</span>
                  <span className="text-sm text-gray-800">
                    {new Date(latestVersion.publishedAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 更新内容 */}
          {latestVersion.releaseNotes && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-800">更新内容</h4>
                {latestVersion.releaseNotes.length > 100 && (
                  <Button
                    onClick={() => setShowFullReleaseNotes(!showFullReleaseNotes)}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-blue-600 hover:bg-blue-50"
                  >
                    {showFullReleaseNotes ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        收起
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        展开
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div
                className={`text-sm text-gray-700 whitespace-pre-wrap leading-relaxed ${
                  !showFullReleaseNotes && latestVersion.releaseNotes.length > 100
                    ? 'max-h-20 overflow-hidden'
                    : 'max-h-32 overflow-y-auto'
                }`}
              >
                {!showFullReleaseNotes && latestVersion.releaseNotes.length > 100
                  ? latestVersion.releaseNotes.substring(0, 100) + '...'
                  : latestVersion.releaseNotes
                }
              </div>

              {/* 查看详细更新情况按钮 */}
              {latestVersion.detailUrl && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <Button
                    onClick={() => window.open(latestVersion.detailUrl, '_blank')}
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
          <div className="space-y-3">
            {/* 立即更新按钮 */}
            <Button
              onClick={() => handleAction('update')}
              disabled={isProcessing}
              className={`w-full flex items-center justify-center gap-2 text-sm sm:text-base ${
                isForceUpdate
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {processingAction === 'update' ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                getUpdateButtonIcon()
              )}
              <span className="hidden sm:inline">
                {processingAction === 'update' ? '更新中...' : getUpdateButtonText()}
              </span>
              <span className="sm:hidden">
                {processingAction === 'update' ? '更新中...' : getUpdateButtonTextShort()}
              </span>
            </Button>

            {/* 非强制更新时显示其他选项 */}
            {!isForceUpdate && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAction('postpone')}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex-1 flex items-center justify-center gap-1 text-xs sm:text-sm"
                >
                  {processingAction === 'postpone' ? (
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                  <span className="hidden sm:inline">推迟1天</span>
                  <span className="sm:hidden">推迟</span>
                </Button>

                <Button
                  onClick={() => handleAction('skip')}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex-1 flex items-center justify-center gap-1 text-xs sm:text-sm"
                >
                  {processingAction === 'skip' ? (
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                  <span className="hidden sm:inline">跳过此版本</span>
                  <span className="sm:hidden">跳过</span>
                </Button>
              </div>
            )}
          </div>

          {/* 平台特定说明 */}
          <div className="text-xs text-gray-500 text-center bg-gray-50 rounded p-2">
            {getUpdateInstructions()}
          </div>

          {/* 强制更新警告 */}
          {isForceUpdate && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">重要提醒</span>
              </div>
              <p className="text-sm text-red-600 mt-1">
                此版本为强制更新，包含重要的安全修复或功能改进，必须更新后才能继续使用。
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
