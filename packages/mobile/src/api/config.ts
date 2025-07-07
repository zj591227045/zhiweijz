/**
 * 移动端API配置
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// 是否为开发环境
const isDev = __DEV__;

// 检查是否为Docker环境
const isDockerEnvironment = (): boolean => {
  // 移动端通常不在Docker环境中运行
  return false;
};

/**
 * 获取API基础URL
 * 支持动态配置，与Web端使用相同的逻辑
 */
export const getApiBaseUrl = async (): Promise<string> => {
  try {
    // 如果是Docker环境，直接使用相对路径（移动端通常不适用）
    if (isDockerEnvironment()) {
      if (isDev) console.log('🐳 Docker环境，使用相对路径: /api');
      return '/api';
    }

    // 从AsyncStorage读取服务器配置
    const storedConfig = await AsyncStorage.getItem('server-config-storage');
    if (storedConfig) {
      try {
        const parsedConfig = JSON.parse(storedConfig);
        const apiUrl = parsedConfig?.state?.config?.currentUrl || 'https://app.zhiweijz.cn:1443/api';

        if (isDev) {
          console.log('📡 从AsyncStorage获取API基础URL:', apiUrl);
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
    return 'https://app.zhiweijz.cn:1443/api';
  }
};

/**
 * API配置常量
 */
export const API_CONFIG = {
  // BASE_URL 现在通过 getApiBaseUrl() 动态获取
  TIMEOUT: 10000, // 10秒超时
  RETRY_ATTEMPTS: 3, // 重试次数
  RETRY_DELAY: 1000, // 重试延迟（毫秒）
} as const;

/**
 * 存储键名常量
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
  CURRENT_ACCOUNT_BOOK: 'current_account_book',
  THEME_SETTINGS: 'theme_settings',
  APP_SETTINGS: 'app_settings',
} as const;
