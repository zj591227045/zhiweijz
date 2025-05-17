"use client";

import { useThemeStore } from "@/store/theme-store";
import { ThemePreviewCard } from "./theme-preview-card";
import Link from "next/link";
import { ThemeItem } from "@/lib/api/theme-service";

interface CurrentThemePreviewProps {
  currentThemeId: string;
  isCustomTheme: boolean;
  builtInThemes: ThemeItem[];
  customThemes: ThemeItem[];
}

export function CurrentThemePreview({
  currentThemeId,
  isCustomTheme,
  builtInThemes,
  customThemes,
}: CurrentThemePreviewProps) {
  const { theme, themeColor } = useThemeStore();

  // 获取当前主题
  const getCurrentTheme = (): ThemeItem | null => {
    if (isCustomTheme) {
      return customThemes.find(t => t.id === currentThemeId) || null;
    } else {
      return builtInThemes.find(t => t.id === currentThemeId) || null;
    }
  };

  // 获取当前主题名称
  const getThemeName = (): string => {
    const currentTheme = getCurrentTheme();
    if (currentTheme) {
      return currentTheme.name;
    }

    // 回退到基于当前应用的主题状态
    if (theme === "dark") return "暗色主题";
    if (theme === "light" && themeColor === "blue") return "默认主题";
    if (theme === "light" && themeColor === "green") return "绿色主题";
    if (theme === "light" && themeColor === "purple") return "紫色主题";
    return "自定义主题";
  };

  // 获取当前主题的编辑链接
  const getEditLink = (): string => {
    if (isCustomTheme) {
      const currentTheme = getCurrentTheme();
      if (currentTheme) {
        return `/settings/theme/edit/${currentTheme.id}`;
      }
    }
    return "/settings/theme/edit";
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">当前主题</h2>
        {isCustomTheme && (
          <Link
            href={getEditLink()}
            className="text-primary text-sm flex items-center"
          >
            <i className="fas fa-edit mr-1"></i>
            编辑
          </Link>
        )}
      </div>

      <ThemePreviewCard
        name={getThemeName()}
        theme={theme}
        themeColor={themeColor}
        isLarge={true}
        isActive={true}
      />
    </div>
  );
}
