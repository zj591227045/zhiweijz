'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Download,
  ExternalLink,
  Clock,
  EyeOff,
  Smartphone,
  Globe,
  Apple,
  Settings
} from 'lucide-react';
import { useVersionInfo, useVersionCheckControl, useManualVersionCheck } from '@/components/version/EnhancedVersionProvider';
import { SimpleVersionCheckIndicator } from '@/components/version/VersionCheckIndicator';

interface VersionCheckSettingsProps {
  className?: string;
}

export function VersionCheckSettings({ className = '' }: VersionCheckSettingsProps) {
  const [isManualChecking, setIsManualChecking] = useState(false);

  // 版本信息和控制 - 添加错误处理
  let versionInfo, versionControl, manualCheck;

  try {
    versionInfo = useVersionInfo();
    versionControl = useVersionCheckControl();
    manualCheck = useManualVersionCheck();
  } catch (error) {
    // 在 SSG 期间或没有 Provider 时的默认值
    versionInfo = {
      currentVersion: '0.6.0',
      currentBuildNumber: 1,
      platform: 'web',
      hasUpdate: false,
      latestVersion: undefined,
      isForceUpdate: false,
      updateMessage: undefined,
      skippedVersionsCount: 0,
      hasPostponedVersion: false,
      lastCheckTime: undefined
    };
    versionControl = {
      isChecking: false,
      error: null,
      clearError: () => {}
    };
    manualCheck = async () => {};
  }

  const {
    currentVersion,
    currentBuildNumber,
    platform,
    hasUpdate,
    latestVersion,
    isForceUpdate,
    updateMessage,
    skippedVersionsCount,
    hasPostponedVersion,
    lastCheckTime
  } = versionInfo;

  const { isChecking, error, clearError } = versionControl;

  /**
   * 手动检查版本
   */
  const handleManualCheck = async () => {
    setIsManualChecking(true);
    try {
      await manualCheck();
    } catch (err) {
      console.error('手动版本检查失败:', err);
    } finally {
      setIsManualChecking(false);
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
   * 格式化时间
   */
  const formatTime = (timeString?: string) => {
    if (!timeString) return '从未检查';
    
    const time = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    
    return time.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 当前版本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            版本信息
          </CardTitle>
          <CardDescription>
            查看当前应用版本和检查更新
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 当前版本 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {getPlatformIcon()}
              <div>
                <div className="font-medium">当前版本</div>
                <div className="text-sm text-gray-600">{getPlatformName()} 平台</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{currentVersion}</div>
              <div className="text-sm text-gray-600">构建号: {currentBuildNumber}</div>
            </div>
          </div>

          {/* 版本检查状态 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">检查状态</span>
              <SimpleVersionCheckIndicator
                isChecking={isChecking || isManualChecking}
                error={error}
                onRetry={clearError}
              />
            </div>
            <Button
              onClick={handleManualCheck}
              disabled={isChecking || isManualChecking}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${(isChecking || isManualChecking) ? 'animate-spin' : ''}`} />
              {isChecking || isManualChecking ? '检查中...' : '检查更新'}
            </Button>
          </div>

          {/* 最后检查时间 */}
          <div className="text-sm text-gray-600">
            最后检查: {formatTime(lastCheckTime)}
          </div>
        </CardContent>
      </Card>

      {/* 更新信息 */}
      {hasUpdate && latestVersion && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              {isForceUpdate ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <Info className="w-5 h-5 text-blue-500" />
              )}
              {isForceUpdate ? '需要更新' : '发现新版本'}
              {isForceUpdate && (
                <Badge variant="destructive" className="ml-2">强制更新</Badge>
              )}
            </CardTitle>
            <CardDescription className="text-blue-600">
              {updateMessage || `发现新版本 ${latestVersion.version}，建议立即更新。`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 版本对比 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-sm text-gray-600 mb-1">当前版本</div>
                <div className="font-semibold">{currentVersion}</div>
              </div>
              <div className="text-center p-3 bg-blue-100 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-600 mb-1">最新版本</div>
                <div className="font-semibold text-blue-700">{latestVersion.version}</div>
              </div>
            </div>

            {/* 更新内容 */}
            {latestVersion.releaseNotes && (
              <div className="bg-white rounded-lg p-3 border">
                <h4 className="text-sm font-medium mb-2">更新内容</h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {latestVersion.releaseNotes}
                </div>
              </div>
            )}

            {/* 发布时间 */}
            {latestVersion.publishedAt && (
              <div className="text-sm text-gray-600">
                发布时间: {new Date(latestVersion.publishedAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 用户偏好设置 */}
      {(skippedVersionsCount > 0 || hasPostponedVersion) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              更新偏好
            </CardTitle>
            <CardDescription>
              您的版本更新偏好设置
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {skippedVersionsCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">已跳过版本</span>
                </div>
                <Badge variant="secondary">{skippedVersionsCount} 个版本</Badge>
              </div>
            )}

            {hasPostponedVersion && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">已推迟更新</span>
                </div>
                <Badge variant="outline" className="border-orange-300 text-orange-700">
                  推迟中
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 无更新状态 */}
      {!hasUpdate && !isChecking && !isManualChecking && !error && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <div className="font-medium text-green-700">已是最新版本</div>
              <div className="text-sm text-green-600">您正在使用最新版本的应用</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 错误状态 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div className="flex-1">
              <div className="font-medium text-red-700">检查失败</div>
              <div className="text-sm text-red-600">{error}</div>
            </div>
            <Button
              onClick={clearError}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              重试
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
