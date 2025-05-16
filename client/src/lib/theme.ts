/**
 * 主题配置类型
 */
export interface ThemeConfig {
  theme: "light" | "dark";
  themeColor: "blue" | "green" | "purple";
}

/**
 * 应用主题配置
 * @param config 主题配置
 */
export function applyThemeConfig(config: ThemeConfig): void {
  const { theme, themeColor } = config;
  
  // 应用暗色/亮色主题
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  
  // 应用主题颜色
  document.documentElement.setAttribute("data-theme-color", themeColor);
  
  // 更新CSS变量
  updateThemeColorVariables(themeColor);
}

/**
 * 更新主题颜色变量
 * @param themeColor 主题颜色
 */
function updateThemeColorVariables(themeColor: string): void {
  const root = document.documentElement;
  
  // 重置所有主题颜色变量
  resetThemeColorVariables();
  
  // 设置新的主题颜色变量
  switch (themeColor) {
    case "blue":
      root.style.setProperty("--primary", "rgb(59, 130, 246)");
      root.style.setProperty("--primary-foreground", "rgb(255, 255, 255)");
      break;
    case "green":
      root.style.setProperty("--primary", "rgb(16, 185, 129)");
      root.style.setProperty("--primary-foreground", "rgb(255, 255, 255)");
      break;
    case "purple":
      root.style.setProperty("--primary", "rgb(139, 92, 246)");
      root.style.setProperty("--primary-foreground", "rgb(255, 255, 255)");
      break;
    default:
      break;
  }
}

/**
 * 重置主题颜色变量
 */
function resetThemeColorVariables(): void {
  const root = document.documentElement;
  root.style.removeProperty("--primary");
  root.style.removeProperty("--primary-foreground");
}
