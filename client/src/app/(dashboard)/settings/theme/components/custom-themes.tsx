"use client";

import Link from "next/link";
import { ThemeItem } from "@/lib/api/theme-service";

interface CustomThemesProps {
  themes: ThemeItem[];
  currentThemeId: string;
  onThemeSelect: (themeId: string) => Promise<void>;
  onDeleteTheme: (themeId: string) => void;
  isLoading: boolean;
}

export function CustomThemes({
  themes,
  currentThemeId,
  onThemeSelect,
  onDeleteTheme,
  isLoading,
}: CustomThemesProps) {
  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return "未知日期";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (error) {
      return "日期格式错误";
    }
  };

  // 应用自定义主题
  const handleThemeSelect = async (themeId: string) => {
    if (!isLoading) {
      await onThemeSelect(themeId);
    }
  };

  // 处理删除主题
  const handleDeleteTheme = (themeId: string) => {
    if (!isLoading) {
      onDeleteTheme(themeId);
    }
  };

  // 获取主题主色调
  const getThemePrimaryColor = (theme: ThemeItem): string => {
    // 这里应该从主题配置中获取主色调
    // 暂时使用固定颜色
    if (theme.id.includes("orange")) return "#F97316";
    if (theme.id.includes("pink")) return "#EC4899";
    if (theme.id.includes("red")) return "#EF4444";
    if (theme.id.includes("blue")) return "#3B82F6";
    if (theme.id.includes("green")) return "#10B981";
    if (theme.id.includes("purple")) return "#8B5CF6";
    return "#3B82F6"; // 默认蓝色
  };

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-4">自定义主题</h2>

      {themes.length > 0 ? (
        <div className="custom-theme-list space-y-3">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className="custom-theme-item flex items-center bg-card rounded-lg p-4 shadow-sm"
            >
              <div
                className="theme-color-preview w-8 h-8 rounded-full mr-4"
                style={{ backgroundColor: getThemePrimaryColor(theme) }}
              ></div>
              <div className="theme-info flex-1">
                <div className="custom-theme-name text-base font-medium text-foreground">
                  {theme.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  更新于 {formatDate(theme.updatedAt)}
                </div>
              </div>
              <div className="theme-actions flex gap-3">
                <button
                  className={`theme-action ${
                    currentThemeId === theme.id
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                  onClick={() => handleThemeSelect(theme.id)}
                  aria-label="应用主题"
                  disabled={isLoading}
                >
                  <i className="fas fa-check"></i>
                </button>
                <Link
                  href={`/settings/theme/edit/${theme.id}`}
                  className="theme-action text-muted-foreground hover:text-primary"
                  aria-label="编辑主题"
                >
                  <i className="fas fa-edit"></i>
                </Link>
                <button
                  className="theme-action text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteTheme(theme.id)}
                  aria-label="删除主题"
                  disabled={isLoading}
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-6">
          暂无自定义主题
        </div>
      )}

      <Link
        href="/settings/theme/create"
        className="create-theme-button mt-4 flex items-center justify-center gap-2 border border-dashed border-border rounded-lg p-4 text-primary hover:bg-primary/5 transition-colors"
      >
        <i className="fas fa-plus"></i>
        <span>创建新主题</span>
      </Link>
    </div>
  );
}
