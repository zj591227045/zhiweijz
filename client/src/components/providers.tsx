"use client";

import { useState, useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useThemeStore, applyThemeConfig } from "@/store/theme-store";

// 配置QueryClient
const queryClientOptions = {
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // 窗口获得焦点时不重新获取数据
      staleTime: 5 * 60 * 1000, // 数据5分钟内不会过期
      cacheTime: 10 * 60 * 1000, // 缓存10分钟
      retry: 1, // 失败时只重试一次
    },
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  // 使用useMemo缓存QueryClient实例
  const queryClient = useMemo(() => new QueryClient(queryClientOptions), []);
  const [mounted, setMounted] = useState(false);

  // 在客户端挂载后应用主题，使用requestIdleCallback优化性能
  useEffect(() => {
    // 使用requestIdleCallback在浏览器空闲时执行非关键任务
    const applyTheme = () => {
      // 获取存储的主题配置
      const themeConfig = useThemeStore.getState();

      // 应用主题配置
      if (themeConfig) {
        applyThemeConfig({
          theme: themeConfig.theme,
          themeColor: themeConfig.themeColor
        });
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

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
