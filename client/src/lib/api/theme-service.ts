import { apiClient } from "@/lib/api";
import { Theme, ThemeColor } from "@/store/theme-store";
import { ThemeConfig as EditorThemeConfig } from "@/types/theme";

// 主题设置接口
export interface ThemeSettings {
  currentTheme: string;
  isCustomTheme: boolean;
}

// 主题接口
export interface ThemeItem {
  id: string;
  name: string;
  thumbnail?: string;
  isSystem: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 主题列表接口
export interface ThemeList {
  builtIn: ThemeItem[];
  custom: ThemeItem[];
}

// 主题配置接口
export interface ThemeConfig {
  name: string;
  description?: string;
  baseTheme: "light" | "dark";
  colors: {
    primary: {
      default: string;
      hover: string;
      active: string;
    };
    background: {
      default: string;
      card: string;
      input: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    border: string;
    error: string;
    success: string;
    warning: string;
  };
}

// 主题服务
class ThemeService {
  // 获取主题详情
  async getThemeById(themeId: string): Promise<EditorThemeConfig> {
    try {
      // 由于后端API可能尚未实现，这里使用模拟实现
      // const response = await apiClient.get(`/api/themes/${themeId}`);
      // return response.data;

      console.log("模拟获取主题详情:", themeId);

      // 返回模拟数据
      return {
        id: themeId,
        name: themeId === "default" ? "默认主题" :
              themeId === "dark" ? "暗色主题" :
              themeId === "green" ? "绿色主题" :
              themeId === "purple" ? "紫色主题" : "自定义主题",
        baseTheme: themeId === "dark" ? "dark" : "light",
        colors: {
          primary: {
            default: themeId === "green" ? "#10B981" :
                    themeId === "purple" ? "#8B5CF6" : "#3B82F6",
            hover: themeId === "green" ? "#059669" :
                  themeId === "purple" ? "#7C3AED" : "#2563EB",
            active: themeId === "green" ? "#047857" :
                   themeId === "purple" ? "#6D28D9" : "#1D4ED8",
          },
          background: {
            default: themeId === "dark" ? "#111827" : "#F9FAFB",
            card: themeId === "dark" ? "#1F2937" : "#FFFFFF",
            input: themeId === "dark" ? "#374151" : "#F3F4F6",
          },
          text: {
            primary: themeId === "dark" ? "#F9FAFB" : "#111827",
            secondary: themeId === "dark" ? "#D1D5DB" : "#4B5563",
            muted: themeId === "dark" ? "#9CA3AF" : "#6B7280",
          },
          border: themeId === "dark" ? "#374151" : "#E5E7EB",
          error: "#EF4444",
          success: "#10B981",
          warning: "#F59E0B",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("获取主题详情失败:", error);
      throw error;
    }
  }

  // 获取基础主题列表
  async getBaseThemes(): Promise<{ id: string; name: string }[]> {
    try {
      // 由于后端API可能尚未实现，这里使用模拟实现
      // const response = await apiClient.get('/api/themes/base');
      // return response.data;

      console.log("模拟获取基础主题列表");

      // 返回模拟数据
      return [
        { id: "light", name: "默认亮色" },
        { id: "dark", name: "默认暗色" },
        { id: "blue", name: "蓝色主题" },
        { id: "green", name: "绿色主题" },
        { id: "purple", name: "紫色主题" },
      ];
    } catch (error) {
      console.error("获取基础主题列表失败:", error);
      throw error;
    }
  }

  // 创建新主题
  async createTheme(theme: EditorThemeConfig): Promise<EditorThemeConfig> {
    try {
      // 由于后端API可能尚未实现，这里使用模拟实现
      // const response = await apiClient.post('/api/themes', theme);
      // return response.data;

      console.log("模拟创建新主题:", theme.name);

      // 返回模拟数据
      return {
        ...theme,
        id: `custom_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("创建新主题失败:", error);
      throw error;
    }
  }

  // 更新主题
  async updateTheme(themeId: string, theme: EditorThemeConfig): Promise<EditorThemeConfig> {
    try {
      // 由于后端API可能尚未实现，这里使用模拟实现
      // const response = await apiClient.put(`/api/themes/${themeId}`, theme);
      // return response.data;

      console.log("模拟更新主题:", themeId, theme.name);

      // 返回模拟数据
      return {
        ...theme,
        id: themeId,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("更新主题失败:", error);
      throw error;
    }
  }

  // 应用主题
  async applyTheme(themeId: string): Promise<void> {
    try {
      // 由于后端API可能尚未实现，这里使用模拟实现
      // const response = await apiClient.put('/api/themes/settings', { themeId });
      // return response.data;

      console.log("模拟应用主题:", themeId);

      // 调用现有的switchTheme方法
      await this.switchTheme(themeId);
    } catch (error) {
      console.error("应用主题失败:", error);
      throw error;
    }
  }
  // 获取主题设置
  async getThemeSettings(): Promise<ThemeSettings> {
    try {
      // 从本地存储获取主题设置
      const themeStorage = localStorage.getItem('theme-storage');
      if (themeStorage) {
        const themeData = JSON.parse(themeStorage);
        const theme = themeData.state?.theme || 'light';
        const themeColor = themeData.state?.themeColor || 'blue';

        // 将主题和主题色转换为主题ID
        let currentTheme = 'default';
        if (theme === 'dark') {
          currentTheme = 'dark';
        } else if (themeColor === 'green') {
          currentTheme = 'green';
        } else if (themeColor === 'purple') {
          currentTheme = 'purple';
        }

        return {
          currentTheme,
          isCustomTheme: false,
        };
      }

      // 如果没有本地存储，返回默认设置
      return {
        currentTheme: "default",
        isCustomTheme: false,
      };
    } catch (error) {
      console.error("获取主题设置失败:", error);
      // 返回默认设置
      return {
        currentTheme: "default",
        isCustomTheme: false,
      };
    }
  }

  // 获取主题列表
  async getThemes(): Promise<ThemeList> {
    try {
      // 返回内置主题列表
      return {
        builtIn: [
          { id: "default", name: "默认主题", isSystem: true },
          { id: "dark", name: "暗色主题", isSystem: true },
          { id: "green", name: "绿色主题", isSystem: true },
          { id: "purple", name: "紫色主题", isSystem: true },
        ],
        custom: [],
      };
    } catch (error) {
      console.error("获取主题列表失败:", error);
      // 返回空列表
      return {
        builtIn: [],
        custom: [],
      };
    }
  }

  // 切换主题
  async switchTheme(themeId: string): Promise<void> {
    try {
      // 将主题ID转换为主题和主题色
      let theme: Theme = 'light';
      let themeColor: ThemeColor = 'blue';

      if (themeId === 'dark') {
        theme = 'dark';
      } else if (themeId === 'green') {
        themeColor = 'green';
      } else if (themeId === 'purple') {
        themeColor = 'purple';
      }

      // 更新本地存储
      const themeStorage = localStorage.getItem('theme-storage');
      if (themeStorage) {
        const themeData = JSON.parse(themeStorage);
        themeData.state = {
          ...themeData.state,
          theme,
          themeColor
        };
        localStorage.setItem('theme-storage', JSON.stringify(themeData));
      }

      // 应用主题
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const html = document.documentElement;

        // 设置暗色/亮色模式
        if (theme === 'dark') {
          html.classList.remove('light');
          html.classList.add('dark');
          html.setAttribute('data-theme', 'dark');
          html.classList.add('dark-theme');
          html.classList.remove('light-theme');
        } else {
          html.classList.remove('dark');
          html.classList.add('light');
          html.classList.remove('dark-theme');
          html.classList.add('light-theme');
          html.setAttribute('data-theme', themeColor === 'blue' ? 'default' : themeColor);
        }

        // 设置主题色类
        html.classList.remove('theme-blue', 'theme-green', 'theme-purple');
        html.classList.add(`theme-${themeColor}`);
      }
    } catch (error) {
      console.error("切换主题失败:", error);
      throw error;
    }
  }

  // 删除自定义主题
  async deleteTheme(themeId: string): Promise<void> {
    try {
      // 由于后端API可能尚未实现，这里使用模拟实现
      // await apiClient.delete(`/themes/${themeId}`);
      console.log("模拟删除主题:", themeId);
      // 这里不抛出错误，让UI可以正常工作
    } catch (error) {
      console.error("删除主题失败:", error);
      throw error;
    }
  }

  // 导出主题
  async exportTheme(themeId: string): Promise<Blob> {
    try {
      // 由于后端API可能尚未实现，这里使用模拟实现
      // const response = await apiClient.get(`/themes/${themeId}/export`, {
      //   responseType: "blob",
      // });
      // return response.data;
      console.log("模拟导出主题:", themeId);
      // 创建一个模拟的JSON Blob
      const mockThemeData = {
        id: themeId,
        name: themeId === "default" ? "默认主题" :
              themeId === "dark" ? "暗色主题" :
              themeId === "green" ? "绿色主题" :
              themeId === "purple" ? "紫色主题" : "自定义主题",
        colors: {
          primary: "#3B82F6",
          background: "#FFFFFF",
          text: "#1F2937"
        }
      };
      return new Blob([JSON.stringify(mockThemeData, null, 2)], {
        type: "application/json"
      });
    } catch (error) {
      console.error("导出主题失败:", error);
      throw error;
    }
  }

  // 导入主题
  async importTheme(themeFile: File): Promise<ThemeItem> {
    try {
      // 由于后端API可能尚未实现，这里使用模拟实现
      // const formData = new FormData();
      // formData.append("themeFile", themeFile);
      //
      // const response = await apiClient.post<ThemeItem>("/themes/import", formData, {
      //   headers: {
      //     "Content-Type": "multipart/form-data",
      //   },
      // });
      //
      // return response.data;

      console.log("模拟导入主题文件:", themeFile.name);
      // 返回一个模拟的主题项
      return {
        id: `custom_${Date.now()}`,
        name: themeFile.name.replace(".json", ""),
        isSystem: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("导入主题失败:", error);
      throw error;
    }
  }
}

export const themeService = new ThemeService();
