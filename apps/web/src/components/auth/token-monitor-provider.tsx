'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useAutoTokenMonitor } from '@/hooks/use-token-monitor';

/**
 * Token监控提供者组件
 * 在应用级别提供token自动监控和刷新功能
 */
export function TokenMonitorProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [shouldMonitor, setShouldMonitor] = useState(false);

  // 等待认证状态稳定后再启动监控
  useEffect(() => {
    if (!isLoading) {
      // 认证状态已稳定，可以启动监控
      setShouldMonitor(isAuthenticated);
    }
  }, [isAuthenticated, isLoading]);

  // 启用自动token监控（只在认证状态稳定后）
  useAutoTokenMonitor(shouldMonitor);

  // 监听页面可见性变化，在页面重新可见时检查token状态
  useEffect(() => {
    if (!shouldMonitor) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 页面重新可见，检查token状态');
        // token监控器会自动处理检查
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 页面获得焦点，检查token状态');
        // token监控器会自动处理检查
      }
    };

    // 添加事件监听器
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [shouldMonitor]);

  return <>{children}</>;
}
