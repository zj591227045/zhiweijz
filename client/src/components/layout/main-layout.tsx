"use client";

import { useEffect } from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { useThemeStore } from "@/store/theme-store";
import { applyThemeConfig } from "@/lib/theme";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const themeConfig = useThemeStore();

  // 应用主题配置
  useEffect(() => {
    applyThemeConfig(themeConfig);
  }, [themeConfig.theme, themeConfig.themeColor]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
