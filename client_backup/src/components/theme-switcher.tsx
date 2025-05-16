'use client';

import React from 'react';
import { useTheme } from '@/components/theme-provider';

// 主题选项类型
type ThemeOption = {
  name: string;
  value: string;
  color: string;
};

// 内置主题选项
const themeOptions: ThemeOption[] = [
  { name: '默认主题', value: 'default', color: 'rgb(59, 130, 246)' },
  { name: '暗色主题', value: 'dark', color: 'rgb(31, 41, 55)' },
  { name: '绿色主题', value: 'green', color: 'rgb(16, 185, 129)' },
  { name: '紫色主题', value: 'purple', color: 'rgb(139, 92, 246)' },
];

// 主题切换器组件
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switcher flex gap-2">
      {themeOptions.map((option) => (
        <div
          key={option.value}
          className={`theme-option w-8 h-8 rounded-full cursor-pointer border-2 ${
            theme === option.value ? 'border-foreground' : 'border-transparent'
          }`}
          style={{ backgroundColor: option.color }}
          onClick={() => setTheme(option.value)}
          title={option.name}
        />
      ))}
    </div>
  );
}
