import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

// API基础URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem("auth-token");

    // 如果token存在，添加到请求头
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
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
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

// API方法
export const apiClient = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return api.get(url, config).then((res: AxiosResponse) => res.data);
  },

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.post(url, data, config).then((res: AxiosResponse) => res.data);
  },

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.put(url, data, config).then((res: AxiosResponse) => res.data);
  },

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.patch(url, data, config).then((res: AxiosResponse) => res.data);
  },

  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return api.delete(url, config).then((res: AxiosResponse) => res.data);
  },
};

export default api;
