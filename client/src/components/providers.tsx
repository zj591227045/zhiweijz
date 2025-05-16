"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useThemeStore, applyThemeConfig } from "@/store/theme-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [mounted, setMounted] = useState(false);

  // 在客户端挂载后应用主题
  useEffect(() => {
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
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
