'use client';

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getApiBaseUrl } from './server-config';
import { createLogger } from './logger';

// 创建API专用日志器
const apiLogger = createLogger('API');
const isDev = process.env.NODE_ENV === 'development';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        // 动态获取API基础URL
        const baseURL = getApiBaseUrl();
        config.baseURL = baseURL;
        
        // 使用分级日志记录请求 - 只在debug级别显示详情
        apiLogger.debug('请求', {
          method: config.method?.toUpperCase(),
          url: config.url
        });

        // 自动添加认证token
        let token = null;
        if (typeof window !== 'undefined') {
          // 首先尝试从auth-token获取（直接存储）
          token = localStorage.getItem('auth-token');

          // 如果没有找到，尝试从auth-storage获取（Zustand持久化存储）
          if (!token) {
            try {
              const authStorage = localStorage.getItem('auth-storage');
              if (authStorage) {
                const parsed = JSON.parse(authStorage);
                token = parsed.state?.token || null;
              }
            } catch (error) {
              console.warn('解析auth-storage失败:', error);
            }
          }
        }

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          apiLogger.warn('没有认证token，请求可能被拒绝', { url: config.url });
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response.data;
      },
      (error) => {
        if (error.response?.status === 401) {
          // 检查是否是注销相关的请求，如果是则不自动跳转
          const isDeletionRelated =
            error.config?.url?.includes('/users/me/') &&
            (error.config.url.includes('deletion') || error.config.url.includes('cancel-deletion'));

          // 检查是否是登录请求，登录失败不应该触发自动跳转
          const isLoginRequest = error.config?.url?.includes('/auth/login');

          if (!isDeletionRelated && !isLoginRequest) {
            // Token过期，清除本地存储
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth-token');
              localStorage.removeItem('user');
              localStorage.removeItem('account-book-storage');
              localStorage.removeItem('auth-storage');
              window.location.href = '/auth/login';
            }
          }
        }
        return Promise.reject(error);
      },
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.get(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.post(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.put(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.delete(url, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.patch(url, data, config);
  }
}

// 通用的fetch函数，用于替换原生fetch调用
export const fetchApi = async (url: string, options: RequestInit = {}): Promise<Response> => {
  let fullUrl: string;
  
  // 如果URL已经是完整的HTTP/HTTPS URL，直接使用
  if (url.startsWith('http://') || url.startsWith('https://')) {
    fullUrl = url;
  } else {
    // 否则需要拼接基础URL
    const baseURL = getApiBaseUrl();
    if (url.startsWith('/api')) {
      // 如果URL以/api开头，需要替换掉/api部分，因为baseURL已经包含了/api
      fullUrl = baseURL + url.replace('/api', '');
    } else {
      // 直接拼接
      fullUrl = baseURL + url;
    }
  }

  // 自动添加认证token
  let token = null;
  if (typeof window !== 'undefined') {
    // 首先尝试从auth-token获取（直接存储）
    token = localStorage.getItem('auth-token');

    // 如果没有找到，尝试从auth-storage获取（Zustand持久化存储）
    if (!token) {
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          token = parsed.state?.token || null;
        }
      } catch (error) {
        console.warn('解析auth-storage失败:', error);
      }
    }
  }
  
  // 准备请求头
  const defaultHeaders: Record<string, string> = {};
  
  // 判断是否是图片请求 - 使用URL路径判断
  const isImageRequest = url.includes('/image-proxy/') || url.includes('/avatar/') || url.includes('/attachment/');
  
  // 对于非图片请求，添加Content-Type
  if (!isImageRequest) {
    defaultHeaders['Content-Type'] = 'application/json';
  }
  
  // 添加认证token
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const headers = {
    ...defaultHeaders,
    ...options.headers,
  };

  // 使用debug级别记录fetchApi调用
  apiLogger.debug('fetchApi调用', {
    method: options.method || 'GET',
    url: url.length > 50 ? url.substring(0, 50) + '...' : url,
    hasToken: !!token
  });

  return fetch(fullUrl, {
    ...options,
    headers,
  });
};

export const apiClient = new ApiClient();

// 导出getApiBaseUrl函数供其他组件使用
export { getApiBaseUrl };
