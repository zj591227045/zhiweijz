import axios from "axios";

// 创建API客户端实例 - 使用相对路径
export const apiClient = axios.create({
  baseURL: '/api', // 使用相对路径，避免跨域问题
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 增加超时时间到15秒
  // 添加调试信息
  validateStatus: function (status) {
    console.log('API响应状态码:', status);
    return status >= 200 && status < 300; // 默认的验证逻辑
  }
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

    // 确保PUT请求的Content-Type正确设置
    if (config.method === 'put' || config.method === 'post') {
      config.headers['Content-Type'] = 'application/json';

      // 如果数据是对象，确保它被正确序列化
      if (config.data && typeof config.data === 'object') {
        console.log(`确保${config.method.toUpperCase()}请求数据正确序列化:`, config.data);
      }
    }

    // 添加请求调试信息
    console.log(`API请求 [${config.method?.toUpperCase()}] ${config.url}:`, {
      baseURL: config.baseURL,
      url: config.url,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers,
      params: config.params,
      data: config.data,
      method: config.method
    });

    return config;
  },
  (error) => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    // 添加调试日志
    console.log(`API响应 [${response.config.method?.toUpperCase()}] ${response.config.url}:`, {
      status: response.status,
      headers: response.headers,
      data: response.data
    });

    // 检查响应数据格式
    if (response.data === null || response.data === undefined) {
      console.warn(`API响应 [${response.config.method?.toUpperCase()}] ${response.config.url}: 响应数据为空`);
    } else if (typeof response.data === 'object') {
      if (Array.isArray(response.data)) {
        console.log(`API响应 [${response.config.method?.toUpperCase()}] ${response.config.url}: 响应数据类型为数组，长度 ${response.data.length}`);
        if (response.data.length > 0) {
          console.log('数组第一项示例:', response.data[0]);
        }
      } else if ('data' in response.data && Array.isArray(response.data.data)) {
        console.log(`API响应 [${response.config.method?.toUpperCase()}] ${response.config.url}: 响应数据类型为分页对象，数据长度 ${response.data.data.length}`);
        if (response.data.data.length > 0) {
          console.log('分页数据第一项示例:', response.data.data[0]);
        }
      } else {
        console.log(`API响应 [${response.config.method?.toUpperCase()}] ${response.config.url}: 响应数据类型为对象`);
      }
    } else {
      console.warn(`API响应 [${response.config.method?.toUpperCase()}] ${response.config.url}: 响应数据类型为 ${typeof response.data}`);
    }

    // 直接返回响应数据
    return response.data;
  },
  (error) => {
    // 增强错误处理和调试信息
    console.error('API请求错误:', error);

    // 记录请求配置信息
    if (error.config) {
      console.error('请求配置:', {
        url: error.config.url,
        baseURL: error.config.baseURL,
        method: error.config.method,
        headers: error.config.headers,
        timeout: error.config.timeout
      });
    }

    if (error.response) {
      // 服务器返回错误状态码
      const status = error.response.status;
      console.error(`API错误响应 [${error.config?.method?.toUpperCase()}] ${error.config?.url}:`, {
        status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: error.response.data
      });

      // 如果是401未授权，可能是token过期
      if (status === 401) {
        console.warn('API认证失败: 401 Unauthorized');
        // 清除本地存储的token
        localStorage.removeItem("auth-token");

        // 如果不是登录页面，重定向到登录页
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }

      // 返回错误信息
      return Promise.reject(error.response.data);
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('没有收到响应:', error.request);

      // 检查是否为跨域问题
      if (error.message && (
          error.message.includes('Network Error') ||
          error.message.includes('CORS') ||
          error.message.includes('cross-origin')
      )) {
        console.error('可能存在跨域问题，请检查服务器CORS配置和网络连接');

        // 显示当前API基础URL
        console.info('当前API基础URL:', '/api (相对路径)');
        console.info('当前浏览器URL:', typeof window !== 'undefined' ? window.location.href : 'N/A');
      }

      return Promise.reject({
        message: '网络错误，无法连接到服务器',
        originalError: error.message
      });
    }

    // 其他错误
    console.error('其他错误:', error.message);
    return Promise.reject({
      message: '请求处理错误',
      originalError: error.message
    });
  }
);
