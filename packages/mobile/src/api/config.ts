/**
 * 移动端API配置
 */

// 开发环境API地址
const DEV_API_BASE_URL = 'http://localhost:3001/api';

// 生产环境API地址（需要根据实际部署地址修改）
const PROD_API_BASE_URL = 'https://your-api-domain.com/api';

// Docker环境API地址
const DOCKER_API_BASE_URL = 'http://backend:3001/api';

/**
 * 获取API基础URL
 * 根据环境自动选择合适的API地址
 */
export const getApiBaseUrl = (): string => {
  // 检查是否在Docker环境中
  if (__DEV__) {
    // 开发环境，可以通过环境变量或其他方式检测
    return DEV_API_BASE_URL;
  } else {
    // 生产环境
    return PROD_API_BASE_URL;
  }
};

/**
 * API配置常量
 */
export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
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
