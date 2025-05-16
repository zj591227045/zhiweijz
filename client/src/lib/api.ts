import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

// 是否为开发环境
const isDev = process.env.NODE_ENV === 'development';

// API基础URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// 简单的内存缓存实现
interface CacheItem {
  data: any;
  expiry: number;
}

class ApiCache {
  private cache: Map<string, CacheItem> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 默认缓存5分钟

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
    for (const key of this.cache.keys()) {
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
    "Content-Type": "application/json",
  },
  // 设置超时时间
  timeout: 10000,
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem("auth-token");

    // 仅在开发环境输出详细日志
    if (isDev) {
      console.log("API请求:", config.method?.toUpperCase(), config.url);
    }

    // 如果token存在，添加到请求头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error("API请求拦截器错误:", error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 仅在开发环境输出详细日志
    if (isDev) {
      console.log("API响应:", response.status, response.config.url);
    }
    return response;
  },
  (error: AxiosError) => {
    // 仅在开发环境输出详细日志
    if (isDev) {
      console.error("API响应错误:", error.message);
      console.error("错误详情:", error.response?.status, error.response?.data);
    }

    // 处理401错误（未授权）
    if (error.response?.status === 401) {
      // 清除本地存储的认证信息
      localStorage.removeItem("auth-token");
      localStorage.removeItem("user");

      // 如果不在登录页面，重定向到登录页
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// API请求函数类型
type ApiRequest = <T = any>(
  url: string,
  options?: AxiosRequestConfig
) => Promise<T>;

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
  get: <T = any>(url: string, config?: AxiosRequestConfig & { useCache?: boolean, cacheTTL?: number }): Promise<T> => {
    const useCache = config?.useCache !== false; // 默认使用缓存
    const cacheTTL = config?.cacheTTL; // 可选的缓存TTL

    // 如果使用缓存，先尝试从缓存获取
    if (useCache && config?.params) {
      const cacheKey = getCacheKey(url, config.params);
      const cachedData = apiCache.get(cacheKey);

      if (cachedData) {
        return Promise.resolve(cachedData);
      }

      // 如果缓存中没有，发起请求并缓存结果
      return api.get(url, config).then((res: AxiosResponse) => {
        apiCache.set(cacheKey, res.data, cacheTTL);
        return res.data;
      });
    }

    // 不使用缓存或没有参数，直接发起请求
    return api.get(url, config).then((res: AxiosResponse) => res.data);
  },

  // POST请求，会使相关GET缓存失效
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.post(url, data, config).then((res: AxiosResponse) => {
      // 使相关缓存失效
      apiCache.invalidate(new RegExp(`^${url.split('/').slice(0, -1).join('/')}`));
      return res.data;
    });
  },

  // PUT请求，会使相关GET缓存失效
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.put(url, data, config).then((res: AxiosResponse) => {
      // 使相关缓存失效
      apiCache.invalidate(new RegExp(`^${url.split('/').slice(0, -1).join('/')}`));
      return res.data;
    });
  },

  // PATCH请求，会使相关GET缓存失效
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.patch(url, data, config).then((res: AxiosResponse) => {
      // 使相关缓存失效
      apiCache.invalidate(new RegExp(`^${url.split('/').slice(0, -1).join('/')}`));
      return res.data;
    });
  },

  // DELETE请求，会使相关GET缓存失效
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return api.delete(url, config).then((res: AxiosResponse) => {
      // 使相关缓存失效
      apiCache.invalidate(new RegExp(`^${url.split('/').slice(0, -1).join('/')}`));
      return res.data;
    });
  },

  // 清除所有缓存
  clearCache: () => {
    apiCache.clear();
  },

  // 使特定URL模式的缓存失效
  invalidateCache: (urlPattern: RegExp) => {
    apiCache.invalidate(urlPattern);
  }
};

export default api;
