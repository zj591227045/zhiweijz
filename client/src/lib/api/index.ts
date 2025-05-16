import axios from "axios";

// 创建API客户端实例
export const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem("auth-token");

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
    // 直接返回响应数据
    return response.data;
  },
  (error) => {
    // 处理错误
    if (error.response) {
      // 服务器返回错误状态码
      const status = error.response.status;

      // 如果是401未授权，可能是token过期
      if (status === 401) {
        // 清除本地存储的token
        localStorage.removeItem("auth-token");

        // 如果不是登录页面，重定向到登录页
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }

      // 返回错误信息
      return Promise.reject(error.response.data);
    }

    // 网络错误或其他错误
    return Promise.reject(error);
  }
);
