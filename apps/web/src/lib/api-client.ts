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
        if (isDev) console.log('API基础URL:', baseURL);
        config.baseURL = baseURL;

        // 自动添加认证token
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response.data;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Token过期，清除本地存储
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-token');
            localStorage.removeItem('user');
            localStorage.removeItem('account-book-storage');
            localStorage.removeItem('auth-storage');
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      }
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
  const baseURL = getApiBaseUrl();
  const fullUrl = url.startsWith('/api') ? baseURL + url.replace('/api', '') : baseURL + url;
  
  // 自动添加认证token
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  if (isDev) console.log('fetchApi 调用:', fullUrl, { method: options.method || 'GET' });

  return fetch(fullUrl, {
    ...options,
    headers,
  });
};

export const apiClient = new ApiClient(); 