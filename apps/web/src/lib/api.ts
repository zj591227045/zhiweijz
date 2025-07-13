import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { clearAuthCache } from '@/utils/cache-utils';

// 是否为开发环境
const isDev = process.env.NODE_ENV === 'development';

// API基础URL - 使用相对路径，通过Next.js代理转发到后端
const API_BASE_URL = '/api'; // 使用相对路径，避免跨域问题
console.log('API基础URL:', API_BASE_URL);

// 简单的内存缓存实现
interface CacheItem {
  data: any;
  expiry: number;
}

class ApiCache {
  private cache: Map<string, CacheItem> = new Map();
  private readonly DEFAULT_TTL = 2 * 60 * 1000; // 默认缓存2分钟，减少缓存时间以平衡性能和数据新鲜度

  get(key: string): any | null {
    if (!this.cache.has(key)) return null;

    const item = this.cache.get(key)!;
    const now = Date.now();

    if (now > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  invalidate(keyPattern: RegExp): void {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (keyPattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// 创建缓存实例
const apiCache = new ApiCache();

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 设置超时时间
  timeout: 30000, // 增加到30秒，智能记账API可能需要更长时间
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    let token;

    try {
      // 只在浏览器环境中尝试获取localStorage
      if (typeof window !== 'undefined') {
        token = localStorage.getItem('auth-token');
        if (isDev) console.log('API请求拦截器: 获取到token', token ? '成功' : '失败');
      }
    } catch (error) {
      console.error('API请求拦截器: 获取token失败', error);
    }

    // 仅在开发环境输出详细日志
    if (isDev) console.log('API请求:', config.method?.toUpperCase(), config.url);

    // 如果token存在，添加到请求头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (isDev) console.log('API请求拦截器: 添加Authorization头');
    } else if (isDev) {
      console.warn('API请求拦截器: 没有token，请求可能会被拒绝');
    }

    return config;
  },
  (error) => {
    console.error('API请求拦截器错误:', error);
    return Promise.reject(error);
  },
);

// 标记是否正在刷新token
let isRefreshing = false;
// 等待token刷新的请求队列
let refreshSubscribers: Array<(token: string) => void> = [];

// 将请求添加到队列
const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// 执行队列中的请求
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 仅在开发环境输出详细日志
    if (isDev) {
      console.log('API响应:', response.status, response.config.url);
    }
    return response;
  },
  async (error: AxiosError) => {
    // 仅在开发环境输出详细日志
    if (isDev) {
      console.error('API响应错误:', error.message);
      console.error('错误详情:', error.response?.status, error.response?.data);
    }

    const originalRequest = error.config as any;

    // 处理401错误（未授权）
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 如果是刷新token的请求失败，清除所有认证状态
      if (originalRequest.url === '/auth/refresh') {
        console.log('Token刷新失败，清除所有认证状态');
        // 使用统一的缓存清理函数
        clearAuthCache();
        return Promise.reject(error);
      }

      // 标记请求已重试
      originalRequest._retry = true;

      // 如果已经在刷新token，将请求添加到队列
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        // 尝试刷新token
        const response = await api.post('/auth/refresh');
        const newToken = response.data.token;

        if (newToken) {
          // 更新localStorage中的token
          localStorage.setItem('auth-token', newToken);

          // 更新请求头
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          // 通知队列中的请求
          onTokenRefreshed(newToken);

          // 重试原始请求
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Token刷新失败:', refreshError);

        // 检查是否是网络错误
        const isNetworkError = !refreshError.response;
        const isServerError = refreshError.response?.status >= 500;

        if (isNetworkError) {
          console.log('🌐 网络错误，保留token等待重试');
          // 网络错误时不清除token，让用户可以重试
        } else if (isServerError) {
          console.log('🔧 服务器错误，保留token等待重试');
          // 服务器错误时不清除token，让用户可以重试
        } else {
          console.log('🚨 Token无效，清除认证状态');
          // 只有在token确实无效时才清除
          clearAuthCache();
        }
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// 生成缓存键
const getCacheKey = (url: string, params?: any): string => {
  if (!params) return url;
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result: Record<string, any>, key) => {
      result[key] = params[key];
      return result;
    }, {});
  return `${url}?${JSON.stringify(sortedParams)}`;
};

// API方法
export const apiClient = {
  // GET请求，支持缓存
  get: <T = any>(
    url: string,
    config?: AxiosRequestConfig & { useCache?: boolean; cacheTTL?: number },
  ): Promise<T> => {
    // 仅在开发环境输出详细日志
    if (isDev) console.log('API GET 请求:', url, config);
    const useCache = config?.useCache !== false; // 默认使用缓存
    const cacheTTL = config?.cacheTTL; // 可选的缓存TTL

    // 生成缓存键 - 修改为同时支持有params和无params的情况
    const cacheKey = config?.params ? getCacheKey(url, config.params) : url;

    // 如果使用缓存，先尝试从缓存获取
    if (useCache) {
      const cachedData = apiCache.get(cacheKey);

      if (cachedData) {
        if (isDev) console.log('从缓存获取数据:', url);
        return Promise.resolve(cachedData);
      }

      // 如果缓存中没有，发起请求并缓存结果
      if (isDev) console.log('缓存中没有数据，发起请求:', url);
      return api
        .get(url, config)
        .then((res: AxiosResponse) => {
          if (isDev) console.log('API GET 响应数据:', url);
          // 使用提供的TTL或默认值
          apiCache.set(cacheKey, res.data, cacheTTL);
          return res.data;
        })
        .catch((error) => {
          console.error('API GET 请求错误:', url, error);
          throw error;
        });
    }

    // 不使用缓存或没有参数，直接发起请求
    if (isDev) console.log('不使用缓存，直接发起请求:', url);
    return api
      .get(url, config)
      .then((res: AxiosResponse) => {
        if (isDev) console.log('API GET 响应数据:', url);
        return res.data;
      })
      .catch((error) => {
        console.error('API GET 请求错误:', url, error);
        throw error;
      });
  },

  // POST请求，会使相关GET缓存失效
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.post(url, data, config).then((res: AxiosResponse) => {
      // 使相关缓存失效 - 修复缓存失效逻辑
      const baseUrl = url.split('?')[0]; // 移除查询参数
      const urlParts = baseUrl.split('/').filter((part) => part); // 移除空字符串

      if (isDev) console.log('POST请求完成，清除相关缓存:', baseUrl);

      // 清除完全匹配的缓存
      apiCache.invalidate(new RegExp(`^${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

      // 清除带参数的缓存
      apiCache.invalidate(new RegExp(`^${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?`));

      // 对于更新操作，还要清除列表缓存（如 /transactions）
      if (urlParts.length > 1) {
        const listUrl = '/' + urlParts.slice(0, -1).join('/');
        apiCache.invalidate(new RegExp(`^${listUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
        apiCache.invalidate(new RegExp(`^${listUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?`));
      }

      if (isDev) console.log('缓存清除完成');
      return res.data;
    });
  },

  // PUT请求，会使相关GET缓存失效
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.put(url, data, config).then((res: AxiosResponse) => {
      // 使相关缓存失效 - 修复缓存失效逻辑
      const baseUrl = url.split('?')[0]; // 移除查询参数
      const urlParts = baseUrl.split('/').filter((part) => part); // 移除空字符串

      if (isDev) console.log('PUT请求完成，清除相关缓存:', baseUrl);

      // 清除完全匹配的缓存
      apiCache.invalidate(new RegExp(`^${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

      // 清除带参数的缓存
      apiCache.invalidate(new RegExp(`^${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?`));

      // 对于更新操作，还要清除列表缓存（如 /transactions）
      if (urlParts.length > 1) {
        const listUrl = '/' + urlParts.slice(0, -1).join('/');
        apiCache.invalidate(new RegExp(`^${listUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
        apiCache.invalidate(new RegExp(`^${listUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?`));
      }

      if (isDev) console.log('缓存清除完成');
      return res.data;
    });
  },

  // PATCH请求，会使相关GET缓存失效
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.patch(url, data, config).then((res: AxiosResponse) => {
      // 使相关缓存失效 - 修复缓存失效逻辑
      const baseUrl = url.split('?')[0]; // 移除查询参数
      const urlParts = baseUrl.split('/').filter((part) => part); // 移除空字符串

      if (isDev) console.log('PATCH请求完成，清除相关缓存:', baseUrl);

      // 清除完全匹配的缓存
      apiCache.invalidate(new RegExp(`^${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

      // 清除带参数的缓存
      apiCache.invalidate(new RegExp(`^${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?`));

      // 对于更新操作，还要清除列表缓存（如 /transactions）
      if (urlParts.length > 1) {
        const listUrl = '/' + urlParts.slice(0, -1).join('/');
        apiCache.invalidate(new RegExp(`^${listUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
        apiCache.invalidate(new RegExp(`^${listUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?`));
      }

      if (isDev) console.log('缓存清除完成');
      return res.data;
    });
  },

  // DELETE请求，会使相关GET缓存失效
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return api.delete(url, config).then((res: AxiosResponse) => {
      // 使相关缓存失效 - 修复缓存失效逻辑
      const baseUrl = url.split('?')[0]; // 移除查询参数
      const urlParts = baseUrl.split('/').filter((part) => part); // 移除空字符串

      if (isDev) console.log('DELETE请求完成，清除相关缓存:', baseUrl);

      // 清除完全匹配的缓存
      apiCache.invalidate(new RegExp(`^${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

      // 清除带参数的缓存
      apiCache.invalidate(new RegExp(`^${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?`));

      // 对于删除操作，还要清除列表缓存（如 /transactions）
      if (urlParts.length > 1) {
        const listUrl = '/' + urlParts.slice(0, -1).join('/');
        apiCache.invalidate(new RegExp(`^${listUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
        apiCache.invalidate(new RegExp(`^${listUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?`));
      }

      if (isDev) console.log('缓存清除完成');
      return res.data;
    });
  },

  // 清除所有缓存
  clearCache: () => {
    apiCache.clear();
    console.log('API缓存已清除');
  },

  // 使特定URL模式的缓存失效
  invalidateCache: (urlPattern: RegExp) => {
    apiCache.invalidate(urlPattern);
  },

  // 全局缓存清理函数 - 用于登出时彻底清理
  clearAllCache: () => {
    // 清除API缓存
    apiCache.clear();

    // 清除localStorage中的所有缓存数据
    if (typeof window !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.includes('auth') ||
            key.includes('account-book') ||
            key.includes('budget') ||
            key.includes('transaction') ||
            key.includes('category') ||
            key.includes('family') ||
            key.includes('statistics') ||
            key.includes('dashboard') ||
            key.includes('ai-services') ||
            key.includes('llm-cache') ||
            key.includes('theme'))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
        console.log('已清除localStorage项:', key);
      });
    }

    console.log('所有缓存已清除');
  },
};

export default api;
