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
  testConnection: (url: string) => Promise<{ success: boolean; message: string; details?: string }>;
  isDockerEnvironment: () => boolean;
}

// 默认配置
const DEFAULT_CONFIG: ServerConfig = {
  type: 'official',
  officialUrl: 'https://app.zhiweijz.cn:1443/api', // 官方服务器保持固定地址
  customUrl: process.env.NEXT_PUBLIC_EXTERNAL_DOMAIN ? process.env.NEXT_PUBLIC_EXTERNAL_DOMAIN + '/api' : '', // 自定义服务器优先使用环境变量
  currentUrl: 'https://app.zhiweijz.cn:1443/api', // 默认使用官方服务器
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
  return process.env.DOCKER_ENV === 'true';
};

// 自动补全API路径
const normalizeApiUrl = (url: string): string => {
  if (!url) return '';

  // 统一转换为小写协议
  url = url.replace(/^HTTP:\/\//i, 'http://').replace(/^HTTPS:\/\//i, 'https://');

  // 移除末尾的斜杠
  url = url.replace(/\/+$/, '');

  // 如果没有协议，默认添加http://（用于开发环境）
  if (!url.match(/^https?:\/\//)) {
    url = 'http://' + url;
  }

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

        // 在开发环境中，确保返回完整的URL
        const currentUrl = config.currentUrl || DEFAULT_CONFIG.officialUrl;

        // 如果是相对路径，转换为绝对路径
        if (currentUrl.startsWith('/')) {
          // 在开发环境中，默认使用3000端口的后端服务器
          const isDev = process.env.NODE_ENV === 'development';
          if (isDev) {
            return `http://localhost:3000${currentUrl}`;
          }
          return currentUrl;
        }

        return currentUrl;
      },

      // 测试连接
      testConnection: async (url: string): Promise<{ success: boolean; message: string; details?: any }> => {
        try {
          const testUrl = normalizeApiUrl(url);
          console.log('🔗 测试连接:', testUrl);

          // 检查是否为HTTP连接且在原生平台
          const isHttpUrl = testUrl.startsWith('http://');
          const isNativePlatform = typeof window !== 'undefined' && 
            (window as any).Capacitor?.getPlatform && 
            ['ios', 'android'].includes((window as any).Capacitor.getPlatform());

          if (isHttpUrl && isNativePlatform) {
            // 使用简化的SSL状态检查
            const { canConnectHTTP } = await import('@/lib/ssl-state');
            
            if (!canConnectHTTP()) {
              console.warn('🔒 [测试连接] HTTP连接被SSL安全策略阻止');
              return {
                success: false,
                message: 'HTTP连接被安全策略阻止',
                details: '请启用"允许HTTP连接和不受信任的HTTPS证书"选项后重试'
              };
            }
          }

          // 创建超时控制器
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

          try {
            // 首先尝试健康检查接口
            let response;
            let testEndpoint = `${testUrl}/health`;
            
            try {
              response = await fetch(testEndpoint, {
                method: 'GET',
                mode: 'cors',
                headers: {
                  'Content-Type': 'application/json',
                },
                signal: controller.signal,
                credentials: 'omit',
              });
            } catch (healthError) {
              // 如果健康检查失败，尝试根路径
              console.log('🔗 健康检查失败，尝试根路径');
              testEndpoint = testUrl;
              response = await fetch(testEndpoint, {
                method: 'GET',
                mode: 'cors',
                headers: {
                  'Content-Type': 'application/json',
                },
                signal: controller.signal,
                credentials: 'omit',
              });
            }

            clearTimeout(timeoutId);

            console.log('🔗 响应状态:', response.status, response.statusText);

            // 检查响应状态
            if (response.ok) {
              try {
                const data = await response.json();
                console.log('🔗 服务器响应:', data);
                
                // 检查是否是预期的API响应
                if (data.status === 'healthy' || data.message || data.version) {
                  return {
                    success: true,
                    message: '连接成功',
                    details: `服务器响应正常 (${response.status})`
                  };
                } else {
                  return {
                    success: true,
                    message: '连接成功',
                    details: '服务器可访问，但响应格式可能不是预期的API格式'
                  };
                }
              } catch (jsonError) {
                // 响应不是JSON，但HTTP状态正常
                const text = await response.text();
                console.log('🔗 非JSON响应:', text.substring(0, 200));
                
                if (text.includes('html') || text.includes('<!DOCTYPE')) {
                  return {
                    success: false,
                    message: '服务器返回HTML页面',
                    details: '可能是Web服务器而非API服务器，或API路径不正确'
                  };
                } else {
                  return {
                    success: true,
                    message: '连接成功',
                    details: '服务器可访问，但返回非JSON格式数据'
                  };
                }
              }
            } else {
              // HTTP错误状态
              let errorMessage = `HTTP ${response.status}`;
              let errorDetails = response.statusText;
              
              switch (response.status) {
                case 404:
                  errorMessage = '接口不存在';
                  errorDetails = 'API路径可能不正确，请检查服务器配置';
                  break;
                case 403:
                  errorMessage = '访问被拒绝';
                  errorDetails = '服务器拒绝访问，可能需要认证或权限';
                  break;
                case 500:
                  errorMessage = '服务器内部错误';
                  errorDetails = '服务器出现内部错误，请检查服务器日志';
                  break;
                case 502:
                case 503:
                  errorMessage = '服务不可用';
                  errorDetails = '服务器暂时不可用或正在维护';
                  break;
              }
              
              return {
                success: false,
                message: errorMessage,
                details: errorDetails
              };
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            console.error('🔗 网络请求错误:', fetchError);
            
            // 详细的网络错误分析
            if (fetchError instanceof Error) {
              if (fetchError.name === 'AbortError') {
                return {
                  success: false,
                  message: '连接超时',
                  details: '服务器响应时间超过10秒，请检查网络连接或服务器状态'
                };
              } else if (fetchError.message.includes('CORS')) {
                return {
                  success: false,
                  message: 'CORS跨域错误',
                  details: '服务器未配置允许跨域访问，请检查服务器CORS设置'
                };
              } else if (fetchError.message.includes('NetworkError') || fetchError.message.includes('Failed to fetch')) {
                return {
                  success: false,
                  message: '网络连接失败',
                  details: '无法连接到服务器，请检查网络连接和服务器地址'
                };
              } else if (fetchError.message.includes('SSL') || fetchError.message.includes('certificate')) {
                return {
                  success: false,
                  message: 'SSL证书错误',
                  details: '服务器SSL证书无效，请启用"允许不受信任的HTTPS证书"选项'
                };
              } else {
                return {
                  success: false,
                  message: '连接错误',
                  details: fetchError.message
                };
              }
            }
            
            return {
              success: false,
              message: '未知网络错误',
              details: '发生未知的网络错误'
            };
          }
        } catch (error) {
          console.error('🔗 连接测试失败:', error);
          
          return {
            success: false,
            message: '测试连接失败',
            details: error instanceof Error ? error.message : '未知错误'
          };
        }
      },

      // 检测Docker环境
      isDockerEnvironment: detectDockerEnvironment,
    }),
    {
      name: 'server-config-storage',
      // 只在非Docker环境中持久化配置
      skipHydration: true, // 跳过hydration以避免SSR/客户端不匹配
    },
  ),
);
