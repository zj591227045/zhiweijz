"use client";

import { useThemeStore, Theme, ThemeColor } from "@/store/theme-store";
import { ThemePreviewCard } from "./theme-preview-card";
import { ThemeItem } from "@/lib/api/theme-service";

// 内置主题映射
const themeMapping: Record<string, { theme: Theme; themeColor: ThemeColor }> = {
  "default": { theme: "light", themeColor: "blue" },
  "dark": { theme: "dark", themeColor: "blue" },
  "green": { theme: "light", themeColor: "green" },
  "purple": { theme: "light", themeColor: "purple" },
};

interface BuiltInThemesProps {
  themes: ThemeItem[];
  currentThemeId: string;
  onThemeSelect: (themeId: string) => Promise<void>;
  isLoading: boolean;
}

export function BuiltInThemes({
  themes,
  currentThemeId,
  onThemeSelect,
  isLoading,
}: BuiltInThemesProps) {
  const { theme, themeColor } = useThemeStore();

  // 处理主题选择
  const handleThemeSelect = async (themeId: string) => {
    if (!isLoading) {
      await onThemeSelect(themeId);
    }
  };

  // 获取主题配置
  const getThemeConfig = (themeId: string) => {
    return themeMapping[themeId] || { theme: "light" as Theme, themeColor: "blue" as ThemeColor };
  };

  // 渲染内置主题列表
  const renderThemes = () => {
    if (themes.length === 0) {
      // 使用默认内置主题列表
      return Object.entries(themeMapping).map(([id, config]) => (
        <ThemePreviewCard
          key={id}
          name={id === "default" ? "默认主题" : id === "dark" ? "暗色主题" : `${config.themeColor}色主题`}
          theme={config.theme}
          themeColor={config.themeColor}
          isActive={currentThemeId === id}
          onClick={() => handleThemeSelect(id)}
        />
      ));
    }

    // 使用API返回的内置主题列表
    return themes.map((themeItem) => {
      const config = getThemeConfig(themeItem.id);
      return (
        <ThemePreviewCard
          key={themeItem.id}
          name={themeItem.name}
          theme={config.theme}
          themeColor={config.themeColor}
          isActive={currentThemeId === themeItem.id}
          onClick={() => handleThemeSelect(themeItem.id)}
        />
      );
    });
  };

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-4">内置主题</h2>
      <div className="grid grid-cols-2 gap-4">
        {renderThemes()}
      </div>
    </div>
  );
}
