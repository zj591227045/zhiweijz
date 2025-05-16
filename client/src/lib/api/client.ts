import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

// API基础URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10秒超时
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // 如果有token，添加到请求头
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
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // 处理错误响应
    const { response } = error;
    
    if (response) {
      // 处理401未授权错误
      if (response.status === 401) {
        // 清除本地存储的token
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          
          // 如果不是登录页面，重定向到登录页
          if (window.location.pathname !== '/auth/login') {
            toast.error('登录已过期，请重新登录');
            window.location.href = '/auth/login';
          }
        }
      }
      
      // 显示错误消息
      const errorMessage = response.data?.message || '请求失败，请稍后再试';
      toast.error(errorMessage);
    } else {
      // 网络错误
      toast.error('网络连接失败，请检查您的网络连接');
    }
    
    return Promise.reject(error);
  }
);

// API请求函数
export const api = {
  // GET请求
  get: <T>(url: string, config?: AxiosRequestConfig) => 
    apiClient.get<T>(url, config).then(response => response.data),
  
  // POST请求
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    apiClient.post<T>(url, data, config).then(response => response.data),
  
  // PUT请求
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    apiClient.put<T>(url, data, config).then(response => response.data),
  
  // PATCH请求
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    apiClient.patch<T>(url, data, config).then(response => response.data),
  
  // DELETE请求
  delete: <T>(url: string, config?: AxiosRequestConfig) => 
    apiClient.delete<T>(url, config).then(response => response.data),
};

export default api;
