import { createApiClient } from '@zhiweijz/core';
import { AsyncStorageAdapter } from '../adapters/storage-adapter';
import { API_CONFIG, STORAGE_KEYS } from './config';
import { Alert } from 'react-native';

/**
 * 移动端存储适配器实例
 */
const storage = new AsyncStorageAdapter();

/**
 * 移动端API客户端
 * 基于核心包的API客户端，添加移动端特定的配置和处理
 */
export const apiClient = createApiClient({
  baseURL: API_CONFIG.BASE_URL,
  storage,
  debug: __DEV__, // 开发环境启用调试
});

/**
 * 设置认证令牌
 */
export const setAuthToken = async (token: string) => {
  await storage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

/**
 * 清除认证令牌
 */
export const clearAuthToken = async () => {
  await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  await storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  await storage.removeItem(STORAGE_KEYS.USER_INFO);
  delete apiClient.defaults.headers.common['Authorization'];
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
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('API客户端已初始化，认证令牌已恢复');
    } else {
      console.log('API客户端已初始化，未找到认证令牌');
    }
  } catch (error) {
    console.error('初始化API客户端失败:', error);
  }
};
