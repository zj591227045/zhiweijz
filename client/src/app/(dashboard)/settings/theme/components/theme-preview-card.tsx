"use client";

import { Theme, ThemeColor } from "@/store/theme-store";
import { cn } from "@/lib/utils";

interface ThemePreviewCardProps {
  name: string;
  theme: Theme;
  themeColor: ThemeColor;
  isActive?: boolean;
  isLarge?: boolean;
  onClick?: () => void;
}

export function ThemePreviewCard({
  name,
  theme,
  themeColor,
  isActive = false,
  isLarge = false,
  onClick,
}: ThemePreviewCardProps) {
  // 获取预览样式
  const getPreviewStyles = () => {
    const styles: Record<string, string> = {};

    // 背景色
    if (theme === "dark") {
      styles["--background-color"] = "rgb(17, 24, 39)";
      styles["--card-background"] = "rgb(31, 41, 55)";
      styles["--text-primary"] = "rgb(249, 250, 251)";
      styles["--text-secondary"] = "rgb(156, 163, 175)";
      styles["--border-color"] = "rgb(55, 65, 81)";
    } else {
      styles["--background-color"] = "rgb(249, 250, 251)";
      styles["--card-background"] = "rgb(255, 255, 255)";
      styles["--text-primary"] = "rgb(17, 24, 39)";
      styles["--text-secondary"] = "rgb(107, 114, 128)";
      styles["--border-color"] = "rgb(229, 231, 235)";
    }

    // 主题色
    if (themeColor === "blue") {
      styles["--primary-color"] = theme === "dark" ? "rgb(96, 165, 250)" : "rgb(59, 130, 246)";
    } else if (themeColor === "green") {
      styles["--primary-color"] = theme === "dark" ? "rgb(52, 211, 153)" : "rgb(16, 185, 129)";
    } else if (themeColor === "purple") {
      styles["--primary-color"] = theme === "dark" ? "rgb(167, 139, 250)" : "rgb(139, 92, 246)";
    } else if (themeColor === "orange") {
      styles["--primary-color"] = theme === "dark" ? "rgb(251, 146, 60)" : "rgb(249, 115, 22)";
    } else if (themeColor === "red") {
      styles["--primary-color"] = theme === "dark" ? "rgb(248, 113, 113)" : "rgb(239, 68, 68)";
    }

    return styles;
  };

  return (
    <div
      className={cn(
        "theme-card",
        isActive && "active",
        isLarge && "h-40"
      )}
      style={getPreviewStyles()}
      onClick={onClick}
    >
      <div
        className={cn(
          "theme-preview",
          isLarge && "h-24"
        )}
      >
        <div className="preview-header">
          标题栏
        </div>
        <div className="preview-content">
          <div className="preview-card">
            内容卡片
          </div>
          <div className="preview-button"></div>
        </div>
      </div>
      <div className="theme-name">
        {name}
      </div>
    </div>
  );
}
