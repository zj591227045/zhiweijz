import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Theme, ThemeColor, applyThemeConfig } from "@/store/theme-store";
import { themeService, ThemeItem } from "@/lib/api/theme-service";

// 扩展主题状态接口
interface ExtendedThemeState {
  // 主题列表
  builtInThemes: ThemeItem[];
  customThemes: ThemeItem[];
  
  // 当前主题ID
  currentThemeId: string;
  isCustomTheme: boolean;
  
  // 加载状态
  isLoading: boolean;
  error: string | null;
  
  // 操作方法
  fetchThemes: () => Promise<void>;
  switchTheme: (themeId: string) => Promise<void>;
  deleteTheme: (themeId: string) => Promise<void>;
  importTheme: (file: File) => Promise<void>;
  exportTheme: (themeId: string) => Promise<void>;
}

// 创建扩展主题状态管理
export const useExtendedThemeStore = create<ExtendedThemeState>()(
  persist(
    (set, get) => ({
      // 初始状态
      builtInThemes: [],
      customThemes: [],
      currentThemeId: "default",
      isCustomTheme: false,
      isLoading: false,
      error: null,
      
      // 获取主题列表
      fetchThemes: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // 获取主题设置
          const settings = await themeService.getThemeSettings();
          
          // 获取主题列表
          const themes = await themeService.getThemes();
          
          set({
            builtInThemes: themes.builtIn,
            customThemes: themes.custom,
            currentThemeId: settings.currentTheme,
            isCustomTheme: settings.isCustomTheme,
            isLoading: false,
          });
        } catch (error) {
          console.error("获取主题列表失败:", error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "获取主题列表失败",
          });
        }
      },
      
      // 切换主题
      switchTheme: async (themeId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // 调用API切换主题
          await themeService.switchTheme(themeId);
          
          // 更新状态
          set({
            currentThemeId: themeId,
            isCustomTheme: get().customThemes.some(theme => theme.id === themeId),
            isLoading: false,
          });
          
          // 应用主题配置
          // 这里需要根据主题ID获取对应的主题配置并应用
          // 暂时使用简化的逻辑
          const isCustom = get().customThemes.some(theme => theme.id === themeId);
          
          if (!isCustom) {
            // 内置主题
            if (themeId === "default") {
              applyThemeConfig({ theme: "light", themeColor: "blue" });
            } else if (themeId === "dark") {
              applyThemeConfig({ theme: "dark", themeColor: "blue" });
            } else if (themeId === "green") {
              applyThemeConfig({ theme: "light", themeColor: "green" });
            } else if (themeId === "purple") {
              applyThemeConfig({ theme: "light", themeColor: "purple" });
            }
          }
        } catch (error) {
          console.error("切换主题失败:", error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "切换主题失败",
          });
        }
      },
      
      // 删除主题
      deleteTheme: async (themeId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // 调用API删除主题
          await themeService.deleteTheme(themeId);
          
          // 更新状态
          set({
            customThemes: get().customThemes.filter(theme => theme.id !== themeId),
            isLoading: false,
          });
          
          // 如果删除的是当前主题，切换到默认主题
          if (get().currentThemeId === themeId) {
            get().switchTheme("default");
          }
        } catch (error) {
          console.error("删除主题失败:", error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "删除主题失败",
          });
        }
      },
      
      // 导入主题
      importTheme: async (file: File) => {
        try {
          set({ isLoading: true, error: null });
          
          // 调用API导入主题
          const theme = await themeService.importTheme(file);
          
          // 更新状态
          set({
            customThemes: [...get().customThemes, theme],
            isLoading: false,
          });
        } catch (error) {
          console.error("导入主题失败:", error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "导入主题失败",
          });
        }
      },
      
      // 导出主题
      exportTheme: async (themeId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // 调用API导出主题
          const blob = await themeService.exportTheme(themeId);
          
          // 创建下载链接
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `theme-${themeId}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          set({ isLoading: false });
        } catch (error) {
          console.error("导出主题失败:", error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "导出主题失败",
          });
        }
      },
    }),
    {
      name: "extended-theme-storage",
    }
  )
);
