'use client';

import axios from 'axios';

// 创建API客户端实例
export const apiClient = axios.create({
  baseURL: '/api', // 使用相对路径，通过nginx代理转发到后端
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth-token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理认证错误和数据格式
apiClient.interceptors.response.use(
  (response) => {
    // 详细调试日志
    console.log('🟢 API响应成功:', {
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      dataType: typeof response.data,
      dataLength: Array.isArray(response.data) ? response.data.length :
                  (response.data && typeof response.data === 'object' && response.data.data && Array.isArray(response.data.data)) ? response.data.data.length : 'N/A'
    });
    return response;
  },
  (error) => {
    // 详细错误日志
    console.error('🔴 API错误详情:', {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      responseData: error.response?.data,
      requestHeaders: error.config?.headers,
      responseHeaders: error.response?.headers
    });

    if (error.response?.status === 401) {
      console.warn('🔐 认证失败，清除本地认证信息并重定向到登录页面');
      // 清除本地存储的认证信息
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('user');
        // 重定向到登录页面
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);
