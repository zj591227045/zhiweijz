'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 服务器类型
export type ServerType = 'official' | 'custom';

// 服务器配置接口
export interface ServerConfig {
  type: ServerType;
  officialUrl: string;
  customUrl: string;
  currentUrl: string;
}

// 服务器配置状态接口
interface ServerConfigState {
  config: ServerConfig;
  isConfigured: boolean;

  // 操作方法
  setServerType: (type: ServerType) => void;
  setCustomUrl: (url: string) => void;
  resetToDefault: () => void;
  getCurrentApiUrl: () => string;
  testConnection: (url: string) => Promise<boolean>;
  isDockerEnvironment: () => boolean;
}

// 默认配置
const DEFAULT_CONFIG: ServerConfig = {
  type: 'official',
  officialUrl: 'https://app.zhiweijz.cn:1443/api',
  customUrl: '',
  currentUrl: 'https://app.zhiweijz.cn:1443/api',
};

// 检测是否为Docker环境
const detectDockerEnvironment = (): boolean => {
  // 在浏览器环境中检测
  if (typeof window !== 'undefined') {
    // 检查环境变量（如果可用）
    const isDocker = (window as any).__DOCKER_ENV__ === true;

    // 简化检测逻辑：主要通过环境变量和特定条件判断
    // 开发环境和移动应用环境都不是Docker
    const hostname = window.location.hostname;
    const isLocalDev =
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168');

    //console.log('🔍 Docker环境检测:', { hostname, isLocalDev, isDocker, result: isDocker && !isLocalDev });

    // 只有明确设置了Docker环境变量且不是本地开发环境时才认为是Docker
    return isDocker && !isLocalDev;
  }

  // 服务端渲染时的检测
  return process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'docker';
};

// 自动补全API路径
const normalizeApiUrl = (url: string): string => {
  if (!url) return '';

  // 移除末尾的斜杠
  url = url.replace(/\/+$/, '');

  // 如果没有/api结尾，自动添加
  if (!url.endsWith('/api')) {
    url = url + '/api';
  }

  return url;
};

// 创建服务器配置状态管理
export const useServerConfigStore = create<ServerConfigState>()(
  persist(
    (set, get) => ({
      // 初始状态
      config: DEFAULT_CONFIG,
      isConfigured: true,

      // 设置服务器类型
      setServerType: (type: ServerType) => {
        const { config } = get();
        const newConfig = {
          ...config,
          type,
          currentUrl: type === 'official' ? config.officialUrl : normalizeApiUrl(config.customUrl),
        };

        set({
          config: newConfig,
          isConfigured: true,
        });

        console.log('🔧 服务器类型已切换:', type, '新URL:', newConfig.currentUrl);
      },

      // 设置自定义URL
      setCustomUrl: (url: string) => {
        const { config } = get();
        const normalizedUrl = normalizeApiUrl(url);
        const newConfig = {
          ...config,
          customUrl: normalizedUrl,
          currentUrl: config.type === 'custom' ? normalizedUrl : config.currentUrl,
        };

        set({
          config: newConfig,
          isConfigured: !!normalizedUrl,
        });

        console.log('🔧 自定义URL已设置:', normalizedUrl);
      },

      // 重置为默认配置
      resetToDefault: () => {
        set({
          config: DEFAULT_CONFIG,
          isConfigured: true,
        });
        console.log('🔧 服务器配置已重置为默认值');
      },

      // 获取当前API URL
      getCurrentApiUrl: () => {
        const { config } = get();

        // 如果是Docker环境，使用相对路径
        if (detectDockerEnvironment()) {
          console.log('🐳 检测到Docker环境，使用相对路径');
          return '/api';
        }

        return config.currentUrl || DEFAULT_CONFIG.officialUrl;
      },

      // 测试连接
      testConnection: async (url: string): Promise<boolean> => {
        try {
          const testUrl = normalizeApiUrl(url);
          console.log('🔗 测试连接:', testUrl);

          // 创建超时控制器
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

          try {
            // 使用fetch进行连接测试
            const response = await fetch(`${testUrl}/health`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const isConnected = response.ok;
            console.log('🔗 连接测试结果:', isConnected ? '成功' : '失败');
            return isConnected;
          } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
          }
        } catch (error) {
          console.error('🔗 连接测试失败:', error);
          return false;
        }
      },

      // 检测Docker环境
      isDockerEnvironment: detectDockerEnvironment,
    }),
    {
      name: 'server-config-storage',
      // 只在非Docker环境中持久化配置
      skipHydration: false,
    },
  ),
);
