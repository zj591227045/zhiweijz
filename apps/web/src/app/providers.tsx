'use client';

import { useState, useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useThemeStore, applyThemeConfig } from '@/store/theme-store';
import { AuthInitializer } from '@/components/auth/auth-initializer';
import { RouteGuard } from '@/components/auth/route-guard';
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider';
import { initializeAndroidPlatform } from '@/lib/android-platform';

// 在开发环境下加载调试工具
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  import('@/utils/debug-auth');
}

// 创建QueryClient实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟
      retry: 1,
    },
  },
});

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // 在客户端挂载后应用主题和平台适配
  useEffect(() => {
    const applyTheme = async () => {
      // 获取存储的主题配置
      const themeConfig = useThemeStore.getState();

      // 应用主题配置
      if (themeConfig) {
        applyThemeConfig({
          theme: themeConfig.theme,
          themeColor: themeConfig.themeColor,
        });
      }

      // 初始化Android平台适配
      try {
        await initializeAndroidPlatform();
      } catch (error) {
        console.warn('Android平台适配初始化失败:', error);
      }

      setMounted(true);
    };

    // 使用requestIdleCallback在浏览器空闲时执行
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(applyTheme);
    } else {
      // 降级处理
      setTimeout(applyTheme, 0);
    }
  }, []);

  // 防止服务端渲染不匹配
  if (!mounted) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthInitializer>
          <RouteGuard>{children}</RouteGuard>
          <OnboardingProvider />
        </AuthInitializer>
        <Toaster position="top-center" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
