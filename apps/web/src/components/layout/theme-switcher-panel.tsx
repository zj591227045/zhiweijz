"use client";

import { useThemeStore, Theme, ThemeColor } from "@/store/theme-store";

interface ThemeSwitcherPanelProps {
  onClose?: () => void;
}

export function ThemeSwitcherPanel({ onClose }: ThemeSwitcherPanelProps) {
  const { theme, themeColor, setTheme, setThemeColor } = useThemeStore();

  const themes = [
    {
      theme: "light" as Theme,
      themeColor: "blue" as ThemeColor,
      name: "浅色蓝色",
      description: "经典蓝色主题",
      color: "#3b82f6",
      icon: "fa-palette"
    },
    {
      theme: "light" as Theme,
      themeColor: "green" as ThemeColor,
      name: "浅色绿色",
      description: "清新绿色主题",
      color: "#10b981",
      icon: "fa-leaf"
    },
    {
      theme: "light" as Theme,
      themeColor: "purple" as ThemeColor,
      name: "浅色紫色",
      description: "优雅紫色主题",
      color: "#8b5cf6",
      icon: "fa-gem"
    },
    {
      theme: "dark" as Theme,
      themeColor: "blue" as ThemeColor,
      name: "深色主题",
      description: "护眼深色主题",
      color: "#374151",
      icon: "fa-moon"
    }
  ];

  const handleThemeChange = (selectedTheme: Theme, selectedThemeColor: ThemeColor) => {
    setTheme(selectedTheme);
    setThemeColor(selectedThemeColor);
    // 可选：切换主题后关闭弹窗
    // onClose?.();
  };

  const isActive = (selectedTheme: Theme, selectedThemeColor: ThemeColor) => {
    return theme === selectedTheme && themeColor === selectedThemeColor;
  };

  return (
    <div className="theme-switcher-panel">
      <div className="theme-switcher-header">
        <h4 className="theme-switcher-title">选择主题</h4>
        <p className="theme-switcher-description">快速切换应用主题风格</p>
      </div>

      <div className="theme-options">
        {themes.map((themeOption, index) => (
          <div
            key={`${themeOption.theme}-${themeOption.themeColor}`}
            className={`theme-option ${isActive(themeOption.theme, themeOption.themeColor) ? "active" : ""}`}
            onClick={() => handleThemeChange(themeOption.theme, themeOption.themeColor)}
          >
            <div className="theme-option-preview">
              <div
                className="theme-color-circle"
                style={{ backgroundColor: themeOption.color }}
              >
                <i className={`fas ${themeOption.icon}`}></i>
              </div>
            </div>
            <div className="theme-option-info">
              <div className="theme-option-name">{themeOption.name}</div>
              <div className="theme-option-desc">{themeOption.description}</div>
            </div>
            {isActive(themeOption.theme, themeOption.themeColor) && (
              <div className="theme-option-check">
                <i className="fas fa-check"></i>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
