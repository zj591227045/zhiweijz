"use client";

import { useThemeStore } from "@/store/theme-store";

// 主题切换器组件
export function ThemeSwitcher() {
  const { theme, themeColor, setTheme, setThemeColor } = useThemeStore();

  // 处理主题切换
  const handleThemeChange = (newTheme: string) => {
    if (newTheme === "default") {
      setTheme("light");
      setThemeColor("blue");
    } else if (newTheme === "dark") {
      setTheme("dark");
    } else if (newTheme === "green" || newTheme === "purple") {
      setTheme("light");
      setThemeColor(newTheme as any);
    }
  };

  return (
    <div className="flex justify-center mt-4">
      {/* 主题切换器 */}
      <div className="theme-switcher flex space-x-2">
        <button
          className="w-8 h-8 rounded-full"
          style={{
            backgroundColor: '#3b82f6',
            boxShadow: themeColor === "blue" && theme === "light" ? '0 0 0 2px var(--card-background), 0 0 0 4px #3b82f6' : 'none'
          }}
          onClick={() => handleThemeChange("default")}
          aria-label="蓝色主题"
        ></button>
        <button
          className="w-8 h-8 rounded-full"
          style={{
            backgroundColor: '#1f2937',
            boxShadow: theme === "dark" ? '0 0 0 2px var(--card-background), 0 0 0 4px #1f2937' : 'none'
          }}
          onClick={() => handleThemeChange("dark")}
          aria-label="暗色主题"
        ></button>
        <button
          className="w-8 h-8 rounded-full"
          style={{
            backgroundColor: '#10b981',
            boxShadow: themeColor === "green" && theme === "light" ? '0 0 0 2px var(--card-background), 0 0 0 4px #10b981' : 'none'
          }}
          onClick={() => handleThemeChange("green")}
          aria-label="绿色主题"
        ></button>
        <button
          className="w-8 h-8 rounded-full"
          style={{
            backgroundColor: '#8b5cf6',
            boxShadow: themeColor === "purple" && theme === "light" ? '0 0 0 2px var(--card-background), 0 0 0 4px #8b5cf6' : 'none'
          }}
          onClick={() => handleThemeChange("purple")}
          aria-label="紫色主题"
        ></button>
      </div>
    </div>
  );
}
