'use client';

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getApiBaseUrl } from './server-config';

// 是否为开发环境
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
        if (isDev) {
          console.log('🚀 API请求详情:', {
            url: config.url,
            baseURL: baseURL,
            fullUrl: baseURL + config.url,
            method: config.method?.toUpperCase()
          });
        }
        config.baseURL = baseURL;

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
        if (isDev)
          console.log('🔍 API请求token检查:', {
            hasToken: !!token,
            tokenPrefix: token ? token.substring(0, 20) + '...' : 'null',
            url: config.url,
          });
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          if (isDev)
            console.log('✅ 已添加Authorization头:', `Bearer ${token.substring(0, 20)}...`);
        } else {
          if (isDev) console.warn('⚠️ 没有token，请求可能被拒绝');
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

  if (isDev)
    console.log('🚀 fetchApi 调用:', {
      originalUrl: url,
      fullUrl,
      method: options.method || 'GET',
      hasToken: !!token,
    });

  return fetch(fullUrl, {
    ...options,
    headers,
  });
};

export const apiClient = new ApiClient();

// 导出getApiBaseUrl函数供其他组件使用
export { getApiBaseUrl };
