import { create } from "zustand";
import { persist } from "zustand/middleware";

// 主题类型
export type Theme = "light" | "dark";

// 主题色
export type ThemeColor = "blue" | "green" | "purple" | "orange" | "red";

// 主题配置接口
export interface ThemeConfig {
  theme: Theme;
  themeColor: ThemeColor;
}

// 默认主题配置
export const defaultThemeConfig: ThemeConfig = {
  theme: "light",
  themeColor: "blue",
};

interface ThemeState extends ThemeConfig {
  setTheme: (theme: Theme) => void;
  setThemeColor: (themeColor: ThemeColor) => void;
  toggleTheme: () => void;
}

// 应用主题配置
export function applyThemeConfig(config: ThemeConfig): void {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    // 应用主题
    const html = document.documentElement;
    const body = document.body;

    // 强制清除所有主题相关的类和属性，确保没有冲突
    html.classList.remove("dark", "light", "theme-blue", "theme-green", "theme-purple");
    body.classList.remove("dark", "light", "theme-blue", "theme-green", "theme-purple");

    // 移除所有data-theme相关属性
    html.removeAttribute("data-theme");
    html.removeAttribute("data-theme-color");

    // 重置内联样式
    body.style.backgroundColor = "";
    body.style.color = "";

    // 设置暗色/亮色模式
    if (config.theme === "dark") {
      html.classList.add("dark");
      body.classList.add("dark");
      html.setAttribute("data-theme", "dark");
      body.style.backgroundColor = "#111827"; // 暗色背景色
      body.style.color = "#f3f4f6"; // 暗色文本色
    } else {
      html.classList.add("light");
      body.classList.add("light");

      // 设置主题色
      if (config.themeColor === "blue") {
        html.setAttribute("data-theme", "default");
        html.classList.add("theme-blue");
      } else {
        html.setAttribute("data-theme", config.themeColor);
        html.classList.add(`theme-${config.themeColor}`);
      }
    }

    // 直接应用CSS变量到根元素，确保最高优先级
    applyThemeVariables(config);

    // 触发重绘
    setTimeout(() => {
      const event = new Event('themechange');
      window.dispatchEvent(event);
    }, 0);
  }
}

// 直接应用主题变量到根元素
function applyThemeVariables(config: ThemeConfig): void {
  const { theme, themeColor } = config;
  const root = document.documentElement;

  // 清除之前的内联样式变量
  root.style.cssText = "";

  // 应用基础变量
  if (theme === "dark") {
    // 暗色主题变量
    root.style.setProperty("--background", "17, 24, 39");
    root.style.setProperty("--foreground", "243, 244, 246");
    root.style.setProperty("--card", "31, 41, 55");
    root.style.setProperty("--card-foreground", "243, 244, 246");
    root.style.setProperty("--muted", "55, 65, 81");
    root.style.setProperty("--muted-foreground", "156, 163, 175");
    root.style.setProperty("--border", "55, 65, 81");
  } else {
    // 亮色主题变量
    root.style.setProperty("--background", "249, 250, 251");
    root.style.setProperty("--foreground", "31, 41, 55");
    root.style.setProperty("--card", "255, 255, 255");
    root.style.setProperty("--card-foreground", "31, 41, 55");
    root.style.setProperty("--muted", "243, 244, 246");
    root.style.setProperty("--muted-foreground", "107, 114, 128");
    root.style.setProperty("--border", "229, 231, 235");
  }

  // 应用主题色变量
  switch (themeColor) {
    case "blue":
      root.style.setProperty("--primary", "59, 130, 246");
      root.style.setProperty("--primary-foreground", "255, 255, 255");
      root.style.setProperty("--ring", "59, 130, 246");
      break;
    case "green":
      root.style.setProperty("--primary", "16, 185, 129");
      root.style.setProperty("--primary-foreground", "255, 255, 255");
      root.style.setProperty("--ring", "16, 185, 129");
      break;
    case "purple":
      root.style.setProperty("--primary", "139, 92, 246");
      root.style.setProperty("--primary-foreground", "255, 255, 255");
      root.style.setProperty("--ring", "139, 92, 246");
      break;
  }

  // 设置兼容旧版的变量
  root.style.setProperty("--primary-color", `rgb(var(--primary))`);
  root.style.setProperty("--text-primary", `rgb(var(--foreground))`);
  root.style.setProperty("--text-secondary", `rgb(var(--muted-foreground))`);
  root.style.setProperty("--border-color", `rgb(var(--border))`);
  root.style.setProperty("--card-background", `rgb(var(--card))`);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      ...defaultThemeConfig,

      setTheme: (theme: Theme) => {
        const newConfig = { ...get(), theme };
        set(newConfig);
        applyThemeConfig(newConfig);
      },

      setThemeColor: (themeColor: ThemeColor) => {
        const newConfig = { ...get(), themeColor };
        set(newConfig);
        applyThemeConfig(newConfig);
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === "light" ? "dark" : "light";
        const newConfig = { ...get(), theme: newTheme };
        set(newConfig);
        applyThemeConfig(newConfig);
      },
    }),
    {
      name: "theme-storage",
      onRehydrateStorage: (state) => {
        return (rehydratedState) => {
          if (rehydratedState) {
            // 在客户端应用主题
            applyThemeConfig(rehydratedState);
          }
        };
      },
    }
  )
);
