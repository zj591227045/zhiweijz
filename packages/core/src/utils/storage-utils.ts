import { StorageAdapter } from "../models/common";

/**
 * 创建本地存储适配器
 * @returns 本地存储适配器
 */
export function createLocalStorageAdapter(): StorageAdapter {
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('LocalStorage getItem error:', error);
        return null;
      }
    },
    
    async setItem(key: string, value: string): Promise<void> {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('LocalStorage setItem error:', error);
      }
    },
    
    async removeItem(key: string): Promise<void> {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('LocalStorage removeItem error:', error);
      }
    }
  };
}

/**
 * 创建内存存储适配器
 * @returns 内存存储适配器
 */
export function createMemoryStorageAdapter(): StorageAdapter {
  const storage = new Map<string, string>();
  
  return {
    async getItem(key: string): Promise<string | null> {
      return storage.get(key) || null;
    },
    
    async setItem(key: string, value: string): Promise<void> {
      storage.set(key, value);
    },
    
    async removeItem(key: string): Promise<void> {
      storage.delete(key);
    }
  };
}

/**
 * 创建会话存储适配器
 * @returns 会话存储适配器
 */
export function createSessionStorageAdapter(): StorageAdapter {
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        return sessionStorage.getItem(key);
      } catch (error) {
        console.error('SessionStorage getItem error:', error);
        return null;
      }
    },
    
    async setItem(key: string, value: string): Promise<void> {
      try {
        sessionStorage.setItem(key, value);
      } catch (error) {
        console.error('SessionStorage setItem error:', error);
      }
    },
    
    async removeItem(key: string): Promise<void> {
      try {
        sessionStorage.removeItem(key);
      } catch (error) {
        console.error('SessionStorage removeItem error:', error);
      }
    }
  };
}
