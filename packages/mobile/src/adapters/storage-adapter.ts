import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 存储适配器接口
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * AsyncStorage适配器实现
 * 为移动端提供统一的存储接口
 */
export class AsyncStorageAdapter implements StorageAdapter {
  /**
   * 获取存储项
   */
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('AsyncStorage getItem error:', error);
      return null;
    }
  }

  /**
   * 设置存储项
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('AsyncStorage setItem error:', error);
      throw error;
    }
  }

  /**
   * 移除存储项
   */
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('AsyncStorage removeItem error:', error);
      throw error;
    }
  }

  /**
   * 清空所有存储
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('AsyncStorage clear error:', error);
      throw error;
    }
  }

  /**
   * 获取所有键
   */
  async getAllKeys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('AsyncStorage getAllKeys error:', error);
      return [];
    }
  }

  /**
   * 批量获取多个存储项
   */
  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    try {
      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.error('AsyncStorage multiGet error:', error);
      return keys.map(key => [key, null]);
    }
  }

  /**
   * 批量设置多个存储项
   */
  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (error) {
      console.error('AsyncStorage multiSet error:', error);
      throw error;
    }
  }

  /**
   * 批量移除多个存储项
   */
  async multiRemove(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('AsyncStorage multiRemove error:', error);
      throw error;
    }
  }
}
