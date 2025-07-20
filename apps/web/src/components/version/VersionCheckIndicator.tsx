'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, X, WifiOff } from 'lucide-react';

interface VersionCheckIndicatorProps {
  isChecking: boolean;
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function VersionCheckIndicator({
  isChecking,
  error,
  onRetry,
  onDismiss,
  className = '',
}: VersionCheckIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null);

  // 控制显示逻辑 - 只在错误时显示
  useEffect(() => {
    if (error) {
      setIsVisible(true);

      // 清除之前的自动隐藏定时器
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
        setAutoHideTimer(null);
      }
    } else {
      // 无错误时隐藏
      setIsVisible(false);
    }

    return () => {
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
      }
    };
  }, [error, isVisible]);

  // 手动关闭
  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  // 重试
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  // 如果不可见，不渲染
  if (!isVisible) {
    return null;
  }

  // 检查中状态不显示任何内容
  if (isChecking) {
    return null;
  }

  // 错误状态
  if (error) {
    return (
      <div className={`fixed top-4 right-4 z-50 ${className}`}>
        <div className="bg-white border border-red-200 rounded-lg shadow-lg p-3 max-w-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {error.includes('网络') || error.includes('连接') ? (
                <WifiOff className="w-4 h-4 text-red-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800">版本检查失败</p>
              <p className="text-xs text-red-600 mt-1 break-words">{error}</p>

              <div className="flex items-center gap-2 mt-2">
                {onRetry && (
                  <Button
                    onClick={handleRetry}
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    重试
                  </Button>
                )}

                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-gray-500 hover:bg-gray-100"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 成功状态不显示任何内容
  return null;
}

/**
 * 简化版本的版本检查状态指示器
 * 用于在页面底部或其他位置显示简单的状态
 */
export function SimpleVersionCheckIndicator({
  isChecking,
  error,
  onRetry,
  className = '',
}: Omit<VersionCheckIndicatorProps, 'onDismiss'>) {
  if (isChecking) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>检查更新中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span>检查失败</span>
        {onRetry && (
          <Button
            onClick={onRetry}
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-red-600 hover:bg-red-50"
          >
            重试
          </Button>
        )}
      </div>
    );
  }

  return null;
}

/**
 * 网络状态指示器
 * 显示当前网络连接状态
 */
export function NetworkStatusIndicator({ className = '' }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
      <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 flex items-center gap-3 mx-auto max-w-sm">
        <WifiOff className="w-4 h-4 text-orange-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-orange-800">网络连接已断开</p>
          <p className="text-xs text-orange-600">版本检查功能暂时不可用</p>
        </div>
      </div>
    </div>
  );
}
