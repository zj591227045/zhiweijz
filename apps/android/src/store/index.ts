import { createAuthStore, createAccountBookStore, createCategoryStore, createBudgetStore, createTransactionStore } from '@zhiweijz/core';
import { Alert } from 'react-native';
import { AsyncStorageAdapter, STORAGE_KEYS } from '../adapters/storage-adapter';
import { createApiClient, AndroidApiClient } from '../api/api-client';

/**
 * 全局存储适配器实例
 */
export const globalStorage = new AsyncStorageAdapter();

/**
 * 全局API客户端实例
 */
export const globalApiClient = createApiClient(globalStorage);

/**
 * Android端认证状态管理
 */
export const useAuthStore = createAuthStore({
  apiClient: globalApiClient,
  storage: globalStorage,
  onLoginSuccess: () => {
    console.log('[AuthStore] 登录成功');
  },
  onLoginError: (error) => {
    console.error('[AuthStore] 登录失败:', error);
    Alert.alert('登录失败', error);
  },
  onRegisterSuccess: () => {
    console.log('[AuthStore] 注册成功');
    Alert.alert('注册成功', '欢迎使用只为记账！');
  },
  onRegisterError: (error) => {
    console.error('[AuthStore] 注册失败:', error);
    Alert.alert('注册失败', error);
  },
  onLogout: () => {
    console.log('[AuthStore] 登出成功');
  },
});

/**
 * Android端账本状态管理
 */
export const useAccountBookStore = createAccountBookStore({
  apiClient: globalApiClient,
  storage: globalStorage,
  onSuccess: (message) => {
    console.log('[AccountBookStore] 操作成功:', message);
  },
  onError: (error) => {
    console.error('[AccountBookStore] 操作失败:', error);
    // 错误处理在组件中进行，避免全局弹窗
  },
});

/**
 * Android端分类状态管理
 */
export const useCategoryStore = createCategoryStore({
  apiClient: globalApiClient,
  storage: globalStorage,
  onSuccess: (message) => {
    console.log('[CategoryStore] 操作成功:', message);
  },
  onError: (error) => {
    console.error('[CategoryStore] 操作失败:', error);
    // 错误处理在组件中进行，避免全局弹窗
  },
});

/**
 * Android端预算状态管理
 */
export const useBudgetStore = createBudgetStore({
  apiClient: globalApiClient,
  storage: globalStorage,
  onSuccess: (message) => {
    console.log('[BudgetStore] 操作成功:', message);
  },
  onError: (error) => {
    console.error('[BudgetStore] 操作失败:', error);
    // 错误处理在组件中进行，避免全局弹窗
  },
});

/**
 * Android端交易状态管理
 */
export const useTransactionStore = createTransactionStore({
  apiClient: globalApiClient,
  storage: globalStorage,
  onSuccess: (message) => {
    console.log('[TransactionStore] 操作成功:', message);
  },
  onError: (error) => {
    console.error('[TransactionStore] 操作失败:', error);
    // 错误处理在组件中进行，避免全局弹窗
  },
});

/**
 * 状态管理初始化函数
 * 在应用启动时调用，用于恢复持久化状态
 */
export async function initializeStores(): Promise<void> {
  try {
    console.log('[StoreManager] 开始初始化状态管理...');

    // 检查存储连接
    const storageInfo = await globalStorage.getAllKeys();
    console.log(`[StoreManager] 存储连接正常，共有 ${storageInfo.length} 个存储项`);

    // 检查API连接
    const isApiConnected = await globalApiClient.checkConnection();
    console.log(`[StoreManager] API连接状态: ${isApiConnected ? '正常' : '异常'}`);

    // 尝试恢复认证状态
    const authToken = await globalStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (authToken) {
      console.log('[StoreManager] 发现已保存的认证令牌，尝试恢复认证状态...');
      await globalApiClient.setAuthToken(authToken);
      
      // 这里可以添加验证令牌有效性的逻辑
      // 例如调用 /auth/verify 接口
    }

    console.log('[StoreManager] 状态管理初始化完成');
  } catch (error) {
    console.error('[StoreManager] 状态管理初始化失败:', error);
    // 不抛出错误，允许应用继续运行
  }
}

/**
 * 清除所有状态和存储
 * 用于登出或重置应用状态
 */
export async function clearAllStores(): Promise<void> {
  try {
    console.log('[StoreManager] 开始清除所有状态...');

    // 清除认证令牌
    await globalApiClient.clearAuthToken();

    // 清除所有存储（可选，根据需求决定）
    // await globalStorage.clear();

    // 或者只清除特定的存储项
    const keysToRemove = [
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_INFO,
      STORAGE_KEYS.AUTH_STORAGE,
    ];
    
    await globalStorage.multiRemove(keysToRemove);

    console.log('[StoreManager] 状态清除完成');
  } catch (error) {
    console.error('[StoreManager] 状态清除失败:', error);
    throw error;
  }
}

/**
 * 获取存储调试信息
 */
export async function getStorageDebugInfo(): Promise<{
  totalKeys: number;
  keys: string[];
  authToken: string | null;
  apiBaseURL: string;
}> {
  try {
    const keys = await globalStorage.getAllKeys();
    const authToken = await globalStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    
    return {
      totalKeys: keys.length,
      keys,
      authToken: authToken ? '***已设置***' : null,
      apiBaseURL: globalApiClient.getBaseURL(),
    };
  } catch (error) {
    console.error('[StoreManager] 获取调试信息失败:', error);
    return {
      totalKeys: 0,
      keys: [],
      authToken: null,
      apiBaseURL: globalApiClient.getBaseURL(),
    };
  }
}

/**
 * 存储健康检查
 */
export async function performStorageHealthCheck(): Promise<{
  storageWorking: boolean;
  apiWorking: boolean;
  authTokenExists: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let storageWorking = false;
  let apiWorking = false;
  let authTokenExists = false;

  try {
    // 测试存储
    const testKey = 'health-check-test';
    const testValue = 'test-value';
    await globalStorage.setItem(testKey, testValue);
    const retrievedValue = await globalStorage.getItem(testKey);
    await globalStorage.removeItem(testKey);
    
    if (retrievedValue === testValue) {
      storageWorking = true;
    } else {
      errors.push('存储读写测试失败');
    }
  } catch (error) {
    errors.push(`存储测试异常: ${error}`);
  }

  try {
    // 测试API连接
    apiWorking = await globalApiClient.checkConnection();
    if (!apiWorking) {
      errors.push('API连接测试失败');
    }
  } catch (error) {
    errors.push(`API测试异常: ${error}`);
  }

  try {
    // 检查认证令牌
    const token = await globalStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    authTokenExists = !!token;
  } catch (error) {
    errors.push(`认证令牌检查异常: ${error}`);
  }

  return {
    storageWorking,
    apiWorking,
    authTokenExists,
    errors,
  };
}
