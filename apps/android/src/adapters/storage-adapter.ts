import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageAdapter } from '@zhiweijz/core';

/**
 * AsyncStorage适配器实现
 * 为Android端提供统一的存储接口，实现StorageAdapter接口
 */
export class AsyncStorageAdapter implements StorageAdapter {
  /**
   * 获取存储项
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      console.log(`[AsyncStorage] getItem: ${key} = ${value ? '***' : 'null'}`);
      return value;
    } catch (error) {
      console.error('[AsyncStorage] getItem error:', error);
      return null;
    }
  }

  /**
   * 设置存储项
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
      console.log(`[AsyncStorage] setItem: ${key} = ${value ? '***' : 'null'}`);
    } catch (error) {
      console.error('[AsyncStorage] setItem error:', error);
      throw error;
    }
  }

  /**
   * 移除存储项
   */
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`[AsyncStorage] removeItem: ${key}`);
    } catch (error) {
      console.error('[AsyncStorage] removeItem error:', error);
      throw error;
    }
  }

  /**
   * 清空所有存储项
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
      console.log('[AsyncStorage] cleared all items');
    } catch (error) {
      console.error('[AsyncStorage] clear error:', error);
      throw error;
    }
  }

  /**
   * 获取所有存储的键
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      console.log(`[AsyncStorage] getAllKeys: ${keys.length} keys found`);
      return keys;
    } catch (error) {
      console.error('[AsyncStorage] getAllKeys error:', error);
      return [];
    }
  }

  /**
   * 批量获取多个存储项
   */
  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    try {
      const result = await AsyncStorage.multiGet(keys);
      console.log(`[AsyncStorage] multiGet: ${keys.length} keys requested`);
      return result;
    } catch (error) {
      console.error('[AsyncStorage] multiGet error:', error);
      return [];
    }
  }

  /**
   * 批量设置多个存储项
   */
  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
      console.log(`[AsyncStorage] multiSet: ${keyValuePairs.length} items set`);
    } catch (error) {
      console.error('[AsyncStorage] multiSet error:', error);
      throw error;
    }
  }

  /**
   * 批量移除多个存储项
   */
  async multiRemove(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
      console.log(`[AsyncStorage] multiRemove: ${keys.length} items removed`);
    } catch (error) {
      console.error('[AsyncStorage] multiRemove error:', error);
      throw error;
    }
  }
}

/**
 * 创建AsyncStorage适配器实例的工厂函数
 */
export function createAsyncStorageAdapter(): AsyncStorageAdapter {
  return new AsyncStorageAdapter();
}

/**
 * 默认的AsyncStorage适配器实例
 */
export const defaultAsyncStorageAdapter = new AsyncStorageAdapter();

/**
 * 存储键名常量
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth-token',
  USER_INFO: 'user-info',
  AUTH_STORAGE: 'auth-storage',
  ACCOUNT_BOOK_STORAGE: 'account-book-storage',
  CATEGORY_STORAGE: 'category-storage',
  BUDGET_STORAGE: 'budget-storage',
  TRANSACTION_STORAGE: 'transaction-storage',
  APP_SETTINGS: 'app-settings',
  THEME_SETTINGS: 'theme-settings',
} as const;

/**
 * 存储工具函数
 */
export const storageUtils = {
  /**
   * 安全地获取JSON数据
   */
  async getJSON<T>(adapter: AsyncStorageAdapter, key: string): Promise<T | null> {
    try {
      const value = await adapter.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`[StorageUtils] getJSON error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * 安全地设置JSON数据
   */
  async setJSON<T>(adapter: AsyncStorageAdapter, key: string, data: T): Promise<void> {
    try {
      await adapter.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`[StorageUtils] setJSON error for key ${key}:`, error);
      throw error;
    }
  },

  /**
   * 检查存储项是否存在
   */
  async exists(adapter: AsyncStorageAdapter, key: string): Promise<boolean> {
    try {
      const value = await adapter.getItem(key);
      return value !== null;
    } catch (error) {
      console.error(`[StorageUtils] exists error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * 获取存储大小信息（调试用）
   */
  async getStorageInfo(adapter: AsyncStorageAdapter): Promise<{
    totalKeys: number;
    keys: string[];
    estimatedSize: number;
  }> {
    try {
      const keys = await adapter.getAllKeys();
      const values = await adapter.multiGet(keys);
      const estimatedSize = values.reduce((size, [key, value]) => {
        return size + key.length + (value?.length || 0);
      }, 0);

      return {
        totalKeys: keys.length,
        keys,
        estimatedSize,
      };
    } catch (error) {
      console.error('[StorageUtils] getStorageInfo error:', error);
      return {
        totalKeys: 0,
        keys: [],
        estimatedSize: 0,
      };
    }
  },
};
