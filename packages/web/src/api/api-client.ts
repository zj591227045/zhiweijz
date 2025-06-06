'use client';

import { createApiClient } from '@zhiweijz/core';
import { LocalStorageAdapter } from '../adapters/storage-adapter';

// 创建存储适配器
const storage = new LocalStorageAdapter();

// 是否为开发环境
const isDev = process.env.NODE_ENV === 'development';

// 检查是否为Docker环境
const isDockerEnvironment = (): boolean => {
  // 检查环境变量
  if (process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'docker') {
    return true;
  }
  
  // 在浏览器环境中检测
  if (typeof window !== 'undefined') {
    // 检查是否设置了Docker环境标记
    const isDocker = (window as any).__DOCKER_ENV__ === true ||
                     process.env.DOCKER_ENV === 'true';
    
    // 检查主机名是否为Docker内部网络
    const hostname = window.location.hostname;
    const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168');
    
    // 只有明确设置了Docker环境变量且不是本地开发环境时才认为是Docker
    return isDocker && !isLocalDev;
  }
  
  return false;
};

// 获取当前API基础URL
const getApiBaseUrl = (): string => {
  // 在服务端渲染时，返回默认值
  if (typeof window === 'undefined') {
    return '/api';
  }

  try {
    // 如果是Docker环境，直接使用相对路径
    if (isDockerEnvironment()) {
      if (isDev) console.log('🐳 Docker环境，使用相对路径: /api');
      return '/api';
    }

    // 直接从LocalStorage读取服务器配置
    const storedConfig = localStorage.getItem('server-config-storage');
    if (storedConfig) {
      try {
        const parsedConfig = JSON.parse(storedConfig);
        const apiUrl = parsedConfig?.state?.config?.currentUrl || 'https://app.zhiweijz.cn:1443/api';
        
        if (isDev) {
          console.log('📡 从LocalStorage获取API基础URL:', apiUrl);
        }
        
        return apiUrl;
      } catch (parseError) {
        console.warn('⚠️ 解析服务器配置失败:', parseError);
      }
    }

    // 回退到默认官方服务器
    const defaultUrl = 'https://app.zhiweijz.cn:1443/api';
    if (isDev) {
      console.log('📡 使用默认API基础URL:', defaultUrl);
    }
    return defaultUrl;
  } catch (error) {
    console.warn('⚠️ 获取服务器配置失败，使用默认值:', error);
    return '/api';
  }
};

// 创建一个包装器来动态获取baseURL
const createDynamicApiClient = () => {
  let cachedClient: any = null;
  let lastBaseURL = '';

  return {
    getClient: () => {
      const currentBaseURL = getApiBaseUrl();
      
      // 如果baseURL发生变化，重新创建客户端
      if (!cachedClient || lastBaseURL !== currentBaseURL) {
        if (isDev) console.log('🔄 重新创建API客户端，baseURL:', currentBaseURL);
        cachedClient = createApiClient({
          baseURL: currentBaseURL,
          storage,
          debug: isDev,
        });
        lastBaseURL = currentBaseURL;
      }
      
      return cachedClient;
    }
  };
};

const dynamicClient = createDynamicApiClient();

// 创建代理对象，动态获取客户端
export const apiClient = new Proxy({}, {
  get(target, prop) {
    const client = dynamicClient.getClient();
    const value = client[prop];
    
    // 如果是函数，绑定正确的this上下文
    if (typeof value === 'function') {
      return value.bind(client);
    }
    
    return value;
  }
});

export default apiClient;
