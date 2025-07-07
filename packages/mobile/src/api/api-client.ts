import { createApiClient } from '@zhiweijz/core';
import { AsyncStorageAdapter } from '../adapters/storage-adapter';
import { API_CONFIG, STORAGE_KEYS, getApiBaseUrl } from './config';
import { Alert } from 'react-native';

/**
 * 移动端存储适配器实例
 */
const storage = new AsyncStorageAdapter();

// 是否为开发环境
const isDev = __DEV__;

// 创建一个包装器来动态获取baseURL
const createDynamicApiClient = () => {
  let cachedClient: any = null;
  let lastBaseURL = '';

  return {
    getClient: async () => {
      const currentBaseURL = await getApiBaseUrl();

      // 如果baseURL发生变化，重新创建客户端
      if (!cachedClient || lastBaseURL !== currentBaseURL) {
        if (isDev) console.log('🔄 重新创建移动端API客户端，baseURL:', currentBaseURL);
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
    // 对于异步方法，返回一个包装函数
    return async (...args: any[]) => {
      const client = await dynamicClient.getClient();
      const value = client[prop];

      // 如果是函数，调用并返回结果
      if (typeof value === 'function') {
        return value.apply(client, args);
      }

      return value;
    };
  }
}) as any;

/**
 * 设置认证令牌
 */
export const setAuthToken = async (token: string) => {
  await storage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  const client = await dynamicClient.getClient();
  client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

/**
 * 清除认证令牌
 */
export const clearAuthToken = async () => {
  await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  await storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  await storage.removeItem(STORAGE_KEYS.USER_INFO);
  const client = await dynamicClient.getClient();
  delete client.defaults.headers.common['Authorization'];
};

/**
 * 获取认证令牌
 */
export const getAuthToken = async (): Promise<string | null> => {
  return await storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
};

/**
 * 检查是否已认证
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getAuthToken();
  return !!token;
};

/**
 * 初始化API客户端
 * 在应用启动时调用，恢复认证状态
 */
export const initializeApiClient = async () => {
  try {
    const token = await getAuthToken();
    if (token) {
      const client = await dynamicClient.getClient();
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('移动端API客户端已初始化，认证令牌已恢复');
    } else {
      console.log('移动端API客户端已初始化，未找到认证令牌');
    }
  } catch (error) {
    console.error('初始化移动端API客户端失败:', error);
  }
};
