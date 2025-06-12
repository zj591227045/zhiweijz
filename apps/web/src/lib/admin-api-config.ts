/**
 * 管理员API配置
 * 统一管理管理员相关的API调用配置
 */

// 获取API基础URL
const getApiBaseUrl = (): string => {
  // 在开发环境中，直接使用后端服务器地址
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // 在生产环境中，使用相对路径（通过代理或同域部署）
  return '';
};

// API基础URL
export const API_BASE_URL = getApiBaseUrl();

// 管理员API端点
export const ADMIN_API_ENDPOINTS = {
  // 认证相关
  LOGIN: `${API_BASE_URL}/api/admin/auth/login`,
  CHECK_AUTH: `${API_BASE_URL}/api/admin/auth/check`,
  
  // LLM日志相关
  LLM_LOGS: `${API_BASE_URL}/api/admin/llm-logs`,
  LLM_LOGS_CLEANUP: `${API_BASE_URL}/api/admin/llm-logs/cleanup`,
  
  // 公告管理相关
  ANNOUNCEMENTS: `${API_BASE_URL}/api/admin/announcements`,
  ANNOUNCEMENT_STATS: `${API_BASE_URL}/api/admin/announcements/stats`,
  
  // 其他管理员API可以在这里添加
  DASHBOARD: `${API_BASE_URL}/api/admin/dashboard`,
  USERS: `${API_BASE_URL}/api/admin/users`,
  SYSTEM_CONFIG: `${API_BASE_URL}/api/admin/system-configs`,
} as const;

/**
 * 创建管理员API请求的通用函数
 * @param endpoint API端点
 * @param options 请求选项
 * @param token 认证token
 */
export const adminApiRequest = async (
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<Response> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 如果提供了token，添加Authorization头
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(endpoint, {
    ...options,
    headers,
  });
};

/**
 * 管理员API调用的便捷方法
 */
export const adminApi = {
  // GET请求
  get: (endpoint: string, token?: string) => 
    adminApiRequest(endpoint, { method: 'GET' }, token),
  
  // POST请求
  post: (endpoint: string, data?: any, token?: string) =>
    adminApiRequest(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, token),
  
  // PUT请求
  put: (endpoint: string, data?: any, token?: string) =>
    adminApiRequest(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, token),
  
  // DELETE请求
  delete: (endpoint: string, token?: string) =>
    adminApiRequest(endpoint, { method: 'DELETE' }, token),
}; 