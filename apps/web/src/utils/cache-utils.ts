'use client';

/**
 * 缓存清理工具函数
 * 用于在用户登出或认证失败时彻底清理所有缓存数据
 */

/**
 * 清除localStorage中的所有业务相关数据
 */
export function clearLocalStorageCache(): void {
  if (typeof window === 'undefined') return;

  console.log('开始清除localStorage缓存...');

  // 需要清除的键名模式
  const keysToRemove: string[] = [];

  // 遍历所有localStorage键
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && shouldRemoveKey(key)) {
      keysToRemove.push(key);
    }
  }

  // 清除匹配的键
  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
    console.log('已清除localStorage项:', key);
  });

  console.log(`localStorage缓存清除完成，共清除 ${keysToRemove.length} 项`);
}

/**
 * 判断是否应该清除某个localStorage键
 */
function shouldRemoveKey(key: string): boolean {
  const patterns = [
    'auth',
    'user',
    'account-book',
    'budget',
    'transaction',
    'category',
    'family',
    'statistics',
    'dashboard',
    'ai-services',
    'llm-cache',
    'theme', // 可选：是否清除主题设置
  ];

  return patterns.some((pattern) => key.includes(pattern));
}

/**
 * 清除API缓存
 */
export function clearApiCache(): void {
  try {
    // 动态导入API客户端以避免循环依赖
    const { apiClient } = require('@/lib/api');
    if (apiClient && typeof apiClient.clearCache === 'function') {
      apiClient.clearCache();
      console.log('API缓存已清除');
    }
  } catch (error) {
    console.warn('清除API缓存失败:', error);
  }
}

/**
 * 清除所有缓存（localStorage + API缓存）
 */
export function clearAllCache(): void {
  console.log('开始清除所有缓存...');

  // 清除localStorage缓存
  clearLocalStorageCache();

  // 清除API缓存
  clearApiCache();

  console.log('所有缓存清除完成');
}

/**
 * 清除认证相关的缓存（保留主题等用户偏好设置）
 */
export function clearAuthCache(): void {
  if (typeof window === 'undefined') return;

  console.log('开始清除认证相关缓存...');

  // 认证相关的键名
  const authKeys = ['auth-token', 'user', 'auth-storage', 'account-book-storage'];

  // 清除认证相关的localStorage项
  authKeys.forEach((key) => {
    localStorage.removeItem(key);
    console.log('已清除认证缓存项:', key);
  });

  // 清除业务数据缓存（但保留主题设置）
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      (key.includes('budget') ||
        key.includes('transaction') ||
        key.includes('category') ||
        key.includes('family') ||
        key.includes('statistics') ||
        key.includes('dashboard') ||
        key.includes('ai-services') ||
        key.includes('llm-cache'))
    ) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
    console.log('已清除业务缓存项:', key);
  });

  // 清除API缓存
  clearApiCache();

  console.log('认证相关缓存清除完成');
}

/**
 * 强制页面重定向到登录页
 */
export function redirectToLogin(delay: number = 500): void {
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      window.location.href = '/login';
    }, delay);
  }
}

/**
 * 完整的登出清理流程
 */
export function performLogoutCleanup(): void {
  console.log('执行登出清理流程...');

  // 清除所有缓存
  clearAllCache();

  // 延迟跳转到登录页，确保清理完成
  redirectToLogin(500);
}
