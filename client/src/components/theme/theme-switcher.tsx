"use client";

import { useThemeStore, applyThemeConfig } from "@/store/theme-store";
import { useEffect } from "react";
import Image from "next/image";

export function ThemeSwitcher() {
  const { theme, setTheme, themeColor, setThemeColor } = useThemeStore();

  // 应用主题配置
  useEffect(() => {
    applyThemeConfig({ theme, themeColor });
  }, [theme, themeColor]);

  // 处理主题切换
  const handleThemeChange = (newTheme: string) => {
    if (newTheme === "default") {
      setTheme("light");
      setThemeColor("blue");
    } else if (newTheme === "dark") {
      setTheme("dark");
    } else if (newTheme === "green" || newTheme === "purple") {
      setTheme("light");
      setThemeColor(newTheme);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* 主题切换器 */}
      <div className="theme-switcher">
        <div
          className={`theme-option default ${themeColor === "blue" && theme === "light" ? "active" : ""}`}
          data-theme="default"
          onClick={() => handleThemeChange("default")}
        ></div>
        <div
          className={`theme-option dark ${theme === "dark" ? "active" : ""}`}
          data-theme="dark"
          onClick={() => handleThemeChange("dark")}
        ></div>
        <div
          className={`theme-option green ${themeColor === "green" ? "active" : ""}`}
          data-theme="green"
          onClick={() => handleThemeChange("green")}
        ></div>
        <div
          className={`theme-option purple ${themeColor === "purple" ? "active" : ""}`}
          data-theme="purple"
          onClick={() => handleThemeChange("purple")}
        ></div>
      </div>

      {/* Logo */}
      <div className="my-8 sm:my-10 md:my-12">
        <Image
          src="/logo.png"
          alt="只为记账"
          width={150}
          height={150}
          className="mx-auto w-[150px] h-[150px] sm:w-[180px] sm:h-[180px] md:w-[210px] md:h-[210px]"
          priority
        />
      </div>
    </div>
  );
}
