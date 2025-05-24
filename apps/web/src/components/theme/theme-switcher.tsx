"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

// 简化版的主题切换器，实际使用时需要连接到主题状态管理
export function ThemeSwitcher() {
  const [theme, setTheme] = useState<string>("light");
  const [themeColor, setThemeColor] = useState<string>("blue");

  // 初始化主题
  useEffect(() => {
    // 从localStorage获取主题设置
    const savedTheme = localStorage.getItem("theme") || "light";
    const savedThemeColor = localStorage.getItem("themeColor") || "blue";

    setTheme(savedTheme);
    setThemeColor(savedThemeColor);

    // 应用主题
    applyTheme(savedTheme, savedThemeColor);
  }, []);

  // 应用主题
  const applyTheme = (newTheme: string, newColor: string) => {
    // 设置暗色/亮色模式
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // 设置主题颜色
    document.documentElement.setAttribute("data-theme", newColor);

    // 保存到localStorage
    localStorage.setItem("theme", newTheme);
    localStorage.setItem("themeColor", newColor);
  };

  // 处理主题切换
  const handleThemeChange = (newTheme: string) => {
    if (newTheme === "default") {
      setTheme("light");
      setThemeColor("blue");
      applyTheme("light", "blue");
    } else if (newTheme === "dark") {
      setTheme("dark");
      applyTheme("dark", themeColor);
    } else if (newTheme === "green" || newTheme === "purple") {
      setTheme("light");
      setThemeColor(newTheme);
      applyTheme("light", newTheme);
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
