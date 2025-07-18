'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bug, 
  RefreshCw, 
  Trash2, 
  Info, 
  AlertTriangle,
  CheckCircle,
  Clock,
  EyeOff
} from 'lucide-react';
import { 
  useVersionInfo, 
  useVersionCheckControl, 
  useManualVersionCheck 
} from '@/components/version/EnhancedVersionProvider';
import { useVersionCheckDebug } from '@/components/version/AutoVersionChecker';

interface VersionCheckDebugPanelProps {
  className?: string;
}

export function VersionCheckDebugPanel({ className = '' }: VersionCheckDebugPanelProps) {
  const [isClearing, setIsClearing] = useState(false);
  
  // 版本信息和控制
  const versionInfo = useVersionInfo();
  const { isChecking, error, clearError } = useVersionCheckControl();
  const manualCheck = useManualVersionCheck();
  const { triggerCheck, clearLocalData, getStats } = useVersionCheckDebug();

  // 获取统计信息
  const stats = getStats();

  /**
   * 清除本地数据
   */
  const handleClearLocalData = async () => {
    setIsClearing(true);
    try {
      clearLocalData();
      // 等待一下让用户看到操作完成
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsClearing(false);
    }
  };

  /**
   * 模拟不同的版本检查场景
   */
  const simulateScenarios = [
    {
      name: '正常检查',
      description: '执行正常的版本检查',
      action: () => triggerCheck(),
      icon: RefreshCw
    },
    {
      name: '手动检查',
      description: '手动触发版本检查',
      action: () => manualCheck(),
      icon: RefreshCw
    }
  ];

  // 只在开发环境显示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <Bug className="w-5 h-5" />
            版本检查调试面板
          </CardTitle>
          <CardDescription className="text-orange-600">
            开发环境专用调试工具，用于测试版本检查功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 当前状态 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-sm text-gray-600 mb-1">检查状态</div>
              <div className="flex items-center gap-2">
                {isChecking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="text-blue-600">检查中</span>
                  </>
                ) : error ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-red-600">错误</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">空闲</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg p-3 border">
              <div className="text-sm text-gray-600 mb-1">更新状态</div>
              <div className="flex items-center gap-2">
                {versionInfo.hasUpdate ? (
                  <>
                    <Info className="w-4 h-4 text-blue-500" />
                    <span className="text-blue-600">有更新</span>
                    {versionInfo.isForceUpdate && (
                      <Badge variant="destructive" className="text-xs">强制</Badge>
                    )}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">最新</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 版本信息 */}
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-sm font-medium mb-2">版本信息</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">当前版本:</span>
                <span className="ml-2 font-mono">{versionInfo.currentVersion}</span>
              </div>
              <div>
                <span className="text-gray-600">构建号:</span>
                <span className="ml-2 font-mono">{versionInfo.currentBuildNumber}</span>
              </div>
              <div>
                <span className="text-gray-600">平台:</span>
                <span className="ml-2">{versionInfo.platform}</span>
              </div>
              {versionInfo.latestVersion && (
                <div>
                  <span className="text-gray-600">最新版本:</span>
                  <span className="ml-2 font-mono">{versionInfo.latestVersion.version}</span>
                </div>
              )}
            </div>
          </div>

          {/* 用户偏好统计 */}
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-sm font-medium mb-2">用户偏好</div>
            <div className="flex gap-4">
              {stats.skippedVersionsCount > 0 && (
                <div className="flex items-center gap-1">
                  <EyeOff className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">跳过 {stats.skippedVersionsCount} 个版本</span>
                </div>
              )}
              {stats.hasPostponedVersion && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">有推迟的版本</span>
                </div>
              )}
              {stats.lastCheckTime && (
                <div className="text-sm text-gray-600">
                  最后检查: {new Date(stats.lastCheckTime).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">错误信息</span>
              </div>
              <div className="text-sm text-red-600 font-mono">{error}</div>
              <Button
                onClick={clearError}
                size="sm"
                variant="outline"
                className="mt-2 border-red-300 text-red-700 hover:bg-red-100"
              >
                清除错误
              </Button>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="space-y-3">
            <div className="text-sm font-medium">测试操作</div>
            <div className="grid grid-cols-2 gap-2">
              {simulateScenarios.map((scenario, index) => (
                <Button
                  key={index}
                  onClick={scenario.action}
                  disabled={isChecking}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <scenario.icon className="w-4 h-4" />
                  {scenario.name}
                </Button>
              ))}
            </div>
          </div>

          {/* 数据管理 */}
          <div className="border-t pt-4">
            <div className="text-sm font-medium mb-2">数据管理</div>
            <Button
              onClick={handleClearLocalData}
              disabled={isClearing}
              variant="destructive"
              size="sm"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isClearing ? '清除中...' : '清除本地数据'}
            </Button>
            <div className="text-xs text-gray-500 mt-1">
              清除所有版本检查相关的本地存储数据
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
