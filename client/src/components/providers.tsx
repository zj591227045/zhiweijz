"use client";

import { useState, useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useThemeStore, applyThemeConfig } from "@/store/theme-store";

// 配置QueryClient - 优化性能
const queryClientOptions = {
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // 窗口获得焦点时不重新获取数据
      staleTime: 2 * 60 * 1000, // 数据2分钟内不会过期，减少过期时间以平衡性能和数据新鲜度
      cacheTime: 5 * 60 * 1000, // 缓存5分钟，减少内存占用
      retry: 1, // 失败时只重试一次
      refetchOnMount: false, // 组件挂载时不重新获取数据，减少请求次数
      refetchOnReconnect: false, // 网络重连时不重新获取数据，减少请求次数
    },
  },
};

// 在模块加载时立即尝试应用主题，避免闪烁
if (typeof window !== 'undefined') {
  // 尝试从localStorage获取主题配置
  try {
    const themeStorage = localStorage.getItem('theme-storage');
    if (themeStorage) {
      const themeData = JSON.parse(themeStorage);
      if (themeData.state) {
        // 立即应用主题，不等待组件挂载
        applyThemeConfig({
          theme: themeData.state.theme || 'light',
          themeColor: themeData.state.themeColor || 'blue'
        });
      }
    }
  } catch (error) {
    console.warn('Failed to apply theme from localStorage:', error);
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  // 使用useMemo缓存QueryClient实例
  const queryClient = useMemo(() => new QueryClient(queryClientOptions), []);
  const [mounted, setMounted] = useState(false);

  // 在客户端挂载后再次确保主题正确应用
  useEffect(() => {
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

      // 额外的保险措施：延迟再次应用主题，确保所有元素都正确更新
      setTimeout(() => {
        const finalThemeConfig = useThemeStore.getState();
        applyThemeConfig({
          theme: finalThemeConfig.theme,
          themeColor: finalThemeConfig.themeColor
        });
      }, 100);

      // 最后的保险措施：再次延迟应用，特别针对预算元素
      setTimeout(() => {
        const lastThemeConfig = useThemeStore.getState();
        const theme = lastThemeConfig.theme;
        
        // 强制更新预算相关元素的颜色
        const budgetElements = document.querySelectorAll('.dashboard-category-name, .dashboard-budget-amount, .dashboard-budget-amount .current, .dashboard-budget-amount .total, .dashboard-separator');
        budgetElements.forEach(element => {
          if (element instanceof HTMLElement) {
            // 根据主题强制设置颜色
            if (element.classList.contains('dashboard-category-name') || 
                element.classList.contains('dashboard-budget-amount') ||
                element.classList.contains('current')) {
              element.style.color = theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(31, 41, 55)';
            } else if (element.classList.contains('total') || element.classList.contains('dashboard-separator')) {
              element.style.color = theme === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)';
            }
            
            // 短暂延迟后移除内联样式，让CSS变量接管
            setTimeout(() => {
              element.style.removeProperty('color');
            }, 50);
          }
        });
      }, 300);
    };

    // 立即执行，不使用requestIdleCallback，确保主题尽快应用
    applyTheme();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
