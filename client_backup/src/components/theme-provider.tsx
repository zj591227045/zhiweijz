'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, applyTheme, getTheme } from '@/lib/theme';

// 主题上下文类型
type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

// 创建主题上下文
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 主题提供者组件
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('default');
  const [mounted, setMounted] = useState(false);

  // 设置主题
  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  // 初始化主题
  useEffect(() => {
    const savedTheme = getTheme();
    setTheme(savedTheme);
    applyTheme(savedTheme);
    setMounted(true);
  }, []);

  // 避免服务器端渲染时的闪烁
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 使用主题的钩子
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
