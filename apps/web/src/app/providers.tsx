'use client';

import { useState, useEffect, useMemo } from "react";
import { Providers } from "@zhiweijz/web";
import { Toaster } from "sonner";
import { useThemeStore, applyThemeConfig } from "../store/theme-store";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // 在客户端挂载后应用主题
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
      <Providers>
        {children}
        <Toaster position="top-center" />
      </Providers>
    );
  }

  return (
    <Providers>
      {children}
      <Toaster position="top-center" />
    </Providers>
  );
}
