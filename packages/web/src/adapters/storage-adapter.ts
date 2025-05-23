import { StorageAdapter } from '@zhiweijz/core';

// 检查是否在浏览器环境中
const isBrowser = typeof window !== 'undefined';

/**
 * Web平台的本地存储适配器
 */
export class LocalStorageAdapter implements StorageAdapter {
  private memoryStorage = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    if (!isBrowser) {
      return this.memoryStorage.get(key) || null;
    }

    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('LocalStorage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!isBrowser) {
      this.memoryStorage.set(key, value);
      return;
    }

    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('LocalStorage setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!isBrowser) {
      this.memoryStorage.delete(key);
      return;
    }

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('LocalStorage removeItem error:', error);
    }
  }
}

/**
 * Web平台的会话存储适配器
 */
export class SessionStorageAdapter implements StorageAdapter {
  private memoryStorage = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    if (!isBrowser) {
      return this.memoryStorage.get(key) || null;
    }

    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.error('SessionStorage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!isBrowser) {
      this.memoryStorage.set(key, value);
      return;
    }

    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.error('SessionStorage setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!isBrowser) {
      this.memoryStorage.delete(key);
      return;
    }

    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('SessionStorage removeItem error:', error);
    }
  }
}

/**
 * Web平台的内存存储适配器
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private storage = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }
}
