/**
 * 分类缓存服务
 * 实现本地缓存以提高分类数据加载性能
 */

export interface CachedCategory {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  icon: string;
  color?: string;
  isDefault: boolean;
  displayOrder?: number;
  isHidden?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CategoryCache {
  data: CachedCategory[];
  timestamp: number;
  userId: string;
  type?: 'EXPENSE' | 'INCOME';
}

class CategoryCacheService {
  private readonly CACHE_KEY_PREFIX = 'zhiweijz_categories';
  private readonly CACHE_VERSION_KEY = 'zhiweijz_categories_version';

  // 缓存策略：长期缓存，只在特定操作时清除
  private readonly CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30天（几乎永久）

  /**
   * 生成缓存键
   */
  private getCacheKey(userId: string, type?: 'EXPENSE' | 'INCOME'): string {
    return `${this.CACHE_KEY_PREFIX}_${userId}_${type || 'all'}`;
  }

  /**
   * 获取缓存的分类数据
   */
  getCachedCategories(userId: string, type?: 'EXPENSE' | 'INCOME'): CachedCategory[] | null {
    try {
      const cacheKey = this.getCacheKey(userId, type);
      const cachedData = localStorage.getItem(cacheKey);
      
      if (!cachedData) {
        console.log('CategoryCache: 未找到缓存数据');
        return null;
      }

      const cache: CategoryCache = JSON.parse(cachedData);
      
      // 检查缓存是否过期
      const now = Date.now();
      if (now - cache.timestamp > this.CACHE_DURATION) {
        console.log('CategoryCache: 缓存已过期');
        this.clearCache(userId, type);
        return null;
      }

      // 检查用户ID是否匹配
      if (cache.userId !== userId) {
        console.log('CategoryCache: 用户ID不匹配');
        this.clearCache(userId, type);
        return null;
      }

      console.log(`CategoryCache: 从缓存加载 ${cache.data.length} 个分类`);
      return cache.data;
    } catch (error) {
      console.error('CategoryCache: 读取缓存失败', error);
      return null;
    }
  }

  /**
   * 缓存分类数据
   */
  setCachedCategories(userId: string, categories: CachedCategory[], type?: 'EXPENSE' | 'INCOME'): void {
    try {
      const cacheKey = this.getCacheKey(userId, type);
      const cache: CategoryCache = {
        data: categories,
        timestamp: Date.now(),
        userId,
        type
      };

      localStorage.setItem(cacheKey, JSON.stringify(cache));
      console.log(`CategoryCache: 缓存 ${categories.length} 个分类`);
    } catch (error) {
      console.error('CategoryCache: 缓存失败', error);
    }
  }

  /**
   * 清除指定类型的缓存
   */
  clearCache(userId: string, type?: 'EXPENSE' | 'INCOME'): void {
    try {
      const cacheKey = this.getCacheKey(userId, type);
      localStorage.removeItem(cacheKey);
      console.log(`CategoryCache: 清除缓存 ${cacheKey}`);
    } catch (error) {
      console.error('CategoryCache: 清除缓存失败', error);
    }
  }

  /**
   * 清除用户的所有分类缓存
   */
  clearAllUserCache(userId: string): void {
    try {
      // 清除所有类型的缓存
      this.clearCache(userId, 'EXPENSE');
      this.clearCache(userId, 'INCOME');
      this.clearCache(userId); // 清除全部分类缓存
      console.log(`CategoryCache: 清除用户 ${userId} 的所有缓存`);
    } catch (error) {
      console.error('CategoryCache: 清除用户缓存失败', error);
    }
  }

  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    try {
      const keys = Object.keys(localStorage);
      const categoryKeys = keys.filter(key => key.startsWith(this.CACHE_KEY_PREFIX));
      
      categoryKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log(`CategoryCache: 清除所有缓存，共 ${categoryKeys.length} 个`);
    } catch (error) {
      console.error('CategoryCache: 清除所有缓存失败', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { totalCaches: number; totalSize: number } {
    try {
      const keys = Object.keys(localStorage);
      const categoryKeys = keys.filter(key => key.startsWith(this.CACHE_KEY_PREFIX));
      
      let totalSize = 0;
      categoryKeys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          totalSize += data.length;
        }
      });

      return {
        totalCaches: categoryKeys.length,
        totalSize
      };
    } catch (error) {
      console.error('CategoryCache: 获取缓存统计失败', error);
      return { totalCaches: 0, totalSize: 0 };
    }
  }

  /**
   * 检查缓存是否有效
   */
  isCacheValid(userId: string, type?: 'EXPENSE' | 'INCOME'): boolean {
    const cached = this.getCachedCategories(userId, type);
    return cached !== null;
  }

  /**
   * 预热缓存（在用户登录时调用）
   */
  async warmupCache(userId: string, fetchFunction: (type?: 'EXPENSE' | 'INCOME') => Promise<CachedCategory[]>): Promise<void> {
    try {
      console.log('CategoryCache: 开始预热缓存');

      // 预热支出分类缓存
      if (!this.isCacheValid(userId, 'EXPENSE')) {
        const expenseCategories = await fetchFunction('EXPENSE');
        this.setCachedCategories(userId, expenseCategories, 'EXPENSE');
      }

      // 预热收入分类缓存
      if (!this.isCacheValid(userId, 'INCOME')) {
        const incomeCategories = await fetchFunction('INCOME');
        this.setCachedCategories(userId, incomeCategories, 'INCOME');
      }

      console.log('CategoryCache: 缓存预热完成');
    } catch (error) {
      console.error('CategoryCache: 缓存预热失败', error);
    }
  }

  /**
   * 手动刷新缓存（用于添加记账页面的下拉刷新）
   */
  async refreshCache(userId: string, fetchFunction: (type?: 'EXPENSE' | 'INCOME') => Promise<CachedCategory[]>): Promise<void> {
    try {
      console.log('CategoryCache: 手动刷新缓存');

      // 清除现有缓存
      this.clearAllUserCache(userId);

      // 重新获取并缓存数据
      const expenseCategories = await fetchFunction('EXPENSE');
      this.setCachedCategories(userId, expenseCategories, 'EXPENSE');

      const incomeCategories = await fetchFunction('INCOME');
      this.setCachedCategories(userId, incomeCategories, 'INCOME');

      console.log('CategoryCache: 手动刷新完成');
    } catch (error) {
      console.error('CategoryCache: 手动刷新失败', error);
    }
  }

  /**
   * 设置缓存版本（用于强制刷新）
   */
  setCacheVersion(version: string): void {
    try {
      localStorage.setItem(this.CACHE_VERSION_KEY, version);
      console.log(`CategoryCache: 设置缓存版本 ${version}`);
    } catch (error) {
      console.error('CategoryCache: 设置缓存版本失败', error);
    }
  }

  /**
   * 获取缓存版本
   */
  getCacheVersion(): string | null {
    try {
      return localStorage.getItem(this.CACHE_VERSION_KEY);
    } catch (error) {
      console.error('CategoryCache: 获取缓存版本失败', error);
      return null;
    }
  }

  /**
   * 检查缓存版本是否匹配
   */
  isCacheVersionValid(expectedVersion: string): boolean {
    const currentVersion = this.getCacheVersion();
    return currentVersion === expectedVersion;
  }
}

// 导出单例实例
export const categoryCacheService = new CategoryCacheService();

// 导出类型
export type { CategoryCache };
