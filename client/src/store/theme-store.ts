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

    // 设置暗色/亮色模式
    if (config.theme === "dark") {
      html.classList.add("dark");
      body.classList.add("dark");
      html.setAttribute("data-theme", "dark");
      body.style.backgroundColor = "#111827"; // 暗色背景色
      body.style.color = "#f3f4f6"; // 暗色文本色
    } else {
      html.classList.remove("dark");
      body.classList.remove("dark");
      body.style.backgroundColor = "";
      body.style.color = "";

      // 设置主题色
      if (config.themeColor === "blue") {
        html.setAttribute("data-theme", "default");
      } else {
        html.setAttribute("data-theme", config.themeColor);
      }
    }
  }
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
