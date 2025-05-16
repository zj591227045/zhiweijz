"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useThemeStore } from "@/store/theme-store";
import { applyThemeConfig } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { theme, toggleTheme, themeColor } = useThemeStore();

  // 应用主题配置
  useEffect(() => {
    applyThemeConfig({ theme, themeColor });
  }, [theme, themeColor]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">只为记账</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="切换主题"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {children}
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} 只为记账. 保留所有权利.</p>
      </footer>
    </div>
  );
}
