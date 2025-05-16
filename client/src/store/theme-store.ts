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

    // 使用requestAnimationFrame批量处理DOM操作，减少重绘
    requestAnimationFrame(() => {
      // 设置暗色/亮色模式
      if (config.theme === "dark") {
        html.classList.remove("light");
        html.classList.add("dark");
        html.setAttribute("data-theme", "dark");
      } else {
        html.classList.remove("dark");
        html.classList.add("light");

        // 设置主题色
        html.setAttribute("data-theme", config.themeColor === "blue" ? "default" : config.themeColor);
      }

      // 设置主题色类
      html.classList.remove("theme-blue", "theme-green", "theme-purple");
      html.classList.add(`theme-${config.themeColor}`);

      // 直接应用CSS变量到根元素，确保最高优先级
      applyThemeVariables(config);
    });
  }
}

// 缓存主题变量，避免重复计算
const themeVariables = {
  light: {
    background: "249, 250, 251",
    foreground: "31, 41, 55",
    card: "255, 255, 255",
    cardForeground: "31, 41, 55",
    muted: "243, 244, 246",
    mutedForeground: "107, 114, 128",
    border: "229, 231, 235"
  },
  dark: {
    background: "17, 24, 39",
    foreground: "243, 244, 246",
    card: "31, 41, 55",
    cardForeground: "243, 244, 246",
    muted: "55, 65, 81",
    mutedForeground: "156, 163, 175",
    border: "55, 65, 81"
  },
  colors: {
    blue: {
      primary: "59, 130, 246",
      primaryForeground: "255, 255, 255",
      ring: "59, 130, 246"
    },
    green: {
      primary: "16, 185, 129",
      primaryForeground: "255, 255, 255",
      ring: "16, 185, 129"
    },
    purple: {
      primary: "139, 92, 246",
      primaryForeground: "255, 255, 255",
      ring: "139, 92, 246"
    }
  }
};

// 直接应用主题变量到根元素
function applyThemeVariables(config: ThemeConfig): void {
  const { theme, themeColor } = config;
  const root = document.documentElement;

  // 获取主题变量
  const baseVars = themeVariables[theme];
  const colorVars = themeVariables.colors[themeColor];

  // 应用基础变量
  root.style.setProperty("--background", baseVars.background);
  root.style.setProperty("--foreground", baseVars.foreground);
  root.style.setProperty("--card", baseVars.card);
  root.style.setProperty("--card-foreground", baseVars.cardForeground);
  root.style.setProperty("--muted", baseVars.muted);
  root.style.setProperty("--muted-foreground", baseVars.mutedForeground);
  root.style.setProperty("--border", baseVars.border);

  // 应用主题色变量
  root.style.setProperty("--primary", colorVars.primary);
  root.style.setProperty("--primary-foreground", colorVars.primaryForeground);
  root.style.setProperty("--ring", colorVars.ring);

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
