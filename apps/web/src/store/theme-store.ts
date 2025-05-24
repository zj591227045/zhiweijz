"use client";

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
        // 添加暗色主题标识类，用于CSS选择器
        html.classList.add("dark-theme");
        html.classList.remove("light-theme");
      } else {
        html.classList.remove("dark");
        html.classList.add("light");
        html.classList.remove("dark-theme");
        html.classList.add("light-theme");

        // 设置主题色
        html.setAttribute("data-theme", config.themeColor === "blue" ? "default" : config.themeColor);
      }

      // 设置主题色类
      html.classList.remove("theme-blue", "theme-green", "theme-purple", "theme-orange", "theme-red");
      html.classList.add(`theme-${config.themeColor}`);

      // 直接应用CSS变量到根元素，确保最高优先级
      applyThemeVariables(config);

      // 强制触发重绘
      document.body.style.display = 'none';
      document.body.offsetHeight; // 触发重排
      document.body.style.display = '';
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
  const colorVars = themeVariables.colors[themeColor] || themeVariables.colors.blue;

  // 应用基础变量
  root.style.setProperty("--background", baseVars.background);
  root.style.setProperty("--foreground", baseVars.foreground);
  root.style.setProperty("--card", baseVars.card);
  root.style.setProperty("--card-foreground", baseVars.cardForeground);
  root.style.setProperty("--muted", baseVars.muted);
  root.style.setProperty("--muted-foreground", baseVars.mutedForeground);
  root.style.setProperty("--border", baseVars.border);

  // 设置自定义CSS变量
  if (theme === 'dark') {
    root.style.setProperty("--background-color", "rgb(17, 24, 39)");
    root.style.setProperty("--card-background", "rgb(31, 41, 55)");
    root.style.setProperty("--text-primary", "rgb(243, 244, 246)");
    root.style.setProperty("--text-secondary", "rgb(156, 163, 175)");
    root.style.setProperty("--border-color", "rgb(55, 65, 81)");
    root.style.setProperty("--success-color", "rgb(52, 211, 153)");
    root.style.setProperty("--error-color", "rgb(248, 113, 113)");
    root.style.setProperty("--primary-color", "rgb(96, 165, 250)");
  } else {
    root.style.setProperty("--background-color", "rgb(249, 250, 251)");
    root.style.setProperty("--card-background", "rgb(255, 255, 255)");
    root.style.setProperty("--text-primary", "rgb(31, 41, 55)");
    root.style.setProperty("--text-secondary", "rgb(107, 114, 128)");
    root.style.setProperty("--border-color", "rgb(229, 231, 235)");
    root.style.setProperty("--success-color", "rgb(34, 197, 94)");
    root.style.setProperty("--error-color", "rgb(239, 68, 68)");

    // 根据主题色设置主色调
    if (themeColor === 'blue') {
      root.style.setProperty("--primary-color", "rgb(59, 130, 246)");
    } else if (themeColor === 'green') {
      root.style.setProperty("--primary-color", "rgb(16, 185, 129)");
    } else if (themeColor === 'purple') {
      root.style.setProperty("--primary-color", "rgb(139, 92, 246)");
    }
  }

  // 应用主题色变量
  root.style.setProperty("--primary", colorVars.primary);
  root.style.setProperty("--primary-foreground", colorVars.primaryForeground);
  root.style.setProperty("--ring", colorVars.ring);

  // 设置兼容旧版的变量 - 直接使用RGB值而不是引用变量
  root.style.setProperty("--primary-color", `rgb(${colorVars.primary})`);
  root.style.setProperty("--text-primary", `rgb(${baseVars.foreground})`);
  root.style.setProperty("--text-secondary", `rgb(${baseVars.mutedForeground})`);
  root.style.setProperty("--border-color", `rgb(${baseVars.border})`);
  root.style.setProperty("--card-background", `rgb(${baseVars.card})`);
  root.style.setProperty("--background-color", `rgb(${baseVars.background})`);

  // 设置错误颜色
  root.style.setProperty("--error-color", "rgb(239, 68, 68)");

  // 设置边框半径
  root.style.setProperty("--border-radius", "0.5rem");
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
        // 立即应用默认主题，避免闪烁
        if (typeof window !== "undefined") {
          applyThemeConfig(defaultThemeConfig);
        }

        return (rehydratedState) => {
          if (rehydratedState) {
            // 在客户端应用主题
            applyThemeConfig(rehydratedState);
          } else if (typeof window !== "undefined") {
            // 如果没有恢复状态，应用默认主题
            applyThemeConfig(defaultThemeConfig);
          }
        };
      },
    }
  )
);

// 确保在客户端立即应用主题
if (typeof window !== "undefined") {
  // 使用setTimeout确保在DOM完全加载后应用主题
  setTimeout(() => {
    const state = useThemeStore.getState();
    applyThemeConfig(state);
  }, 0);
}
