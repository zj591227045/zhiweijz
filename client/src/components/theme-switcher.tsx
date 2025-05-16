'use client';

import React from 'react';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { builtInThemes } from '@/lib/theme';

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {themeOptions.map((option) => (
          <ThemeButton
            key={option.value}
            option={option}
            active={theme === option.value}
            onClick={() => setTheme(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

// 主题按钮组件
function ThemeButton({
  option,
  active,
  onClick,
}: {
  option: ThemeOption;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className="flex items-center gap-2"
    >
      <span
        className="h-4 w-4 rounded-full"
        style={{ backgroundColor: option.color }}
      />
      <span>{option.name}</span>
    </Button>
  );
}
