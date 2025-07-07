/**
 * 统一的管理端API客户端
 * 自动识别环境并使用正确的后端地址
 */

// 检测是否为Docker环境
const isDockerEnvironment = (): boolean => {
  if (typeof window !== 'undefined') {
    // 浏览器环境检测
    const isDocker = (window as any).__DOCKER_ENV__ === true;
    const hostname = window.location.hostname;
    const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168');
    
    return isDocker && !isLocalDev;
  }
  
  // 服务端环境检测
  return process.env.DOCKER_ENV === 'true';
};

// 获取管理端API基础URL
const getAdminApiBaseUrl = (): string => {
  // Docker环境使用相对路径
  if (isDockerEnvironment()) {
    console.log('🐳 Docker环境，使用相对路径: /api');
    return '/api';
  }
  
  // 开发环境使用后端服务器地址
  if (process.env.NODE_ENV === 'development') {
    const backendUrl = 'http://localhost:3000';
    console.log('🔧 开发环境，使用后端地址:', backendUrl);
    return backendUrl;
  }
  
  // 生产环境使用相对路径
  console.log('🚀 生产环境，使用相对路径: /api');
  return '/api';
};

// 管理端API端点配置
export const ADMIN_API_ENDPOINTS = {
  // 认证相关
  LOGIN: '/api/admin/auth/login',
  CHECK_AUTH: '/api/admin/auth/check',
  CHANGE_PASSWORD: '/api/admin/auth/change-password',
  
  // 用户管理
  USERS: '/api/admin/users',
  USER_DETAIL: (id: string) => `/api/admin/users/${id}`,
  USER_RESET_PASSWORD: (id: string) => `/api/admin/users/${id}/reset-password`,
  USER_TOGGLE_STATUS: (id: string) => `/api/admin/users/${id}/toggle-status`,
  USER_BATCH: '/api/admin/users/batch',
  
  // 仪表盘
  DASHBOARD_OVERVIEW: '/api/admin/dashboard/overview',
  DASHBOARD_USERS: '/api/admin/dashboard/users',
  DASHBOARD_TRANSACTIONS: '/api/admin/dashboard/transactions',
  DASHBOARD_SYSTEM: '/api/admin/dashboard/system',
  DASHBOARD_PERFORMANCE_HISTORY: '/api/admin/dashboard/performance/history',
  DASHBOARD_PERFORMANCE_ALL: '/api/admin/dashboard/performance/all',
  DASHBOARD_PERFORMANCE_STATS: '/api/admin/dashboard/performance/stats',
  
  // 系统配置
  SYSTEM_CONFIG_REGISTRATION: '/api/admin/system-configs/registration',
  SYSTEM_CONFIG_LLM: '/api/admin/system-configs/llm/configs',

  // 存储管理
  STORAGE_CONFIG: '/api/admin/storage/config',
  STORAGE_STATS: '/api/admin/storage/stats',
  STORAGE_TEST: '/api/admin/storage/test',
  STORAGE_FILES: '/api/admin/storage/files',
  
  // 公告管理
  ANNOUNCEMENTS: '/api/admin/announcements',
  ANNOUNCEMENT_STATS: '/api/admin/announcements/stats',
  
  // LLM日志
  LLM_LOGS: '/api/admin/llm-logs',
  LLM_LOGS_CLEANUP: '/api/admin/llm-logs/cleanup',
  
  // 多提供商LLM管理
  MULTI_PROVIDER_LLM: '/api/admin/multi-provider-llm',
  MULTI_PROVIDER_LLM_CONFIG: '/api/admin/multi-provider-llm/config',
  MULTI_PROVIDER_LLM_CONFIG_PRIORITY: '/api/admin/multi-provider-llm/config/priority-info',
  MULTI_PROVIDER_LLM_PROVIDERS: '/api/admin/multi-provider-llm/providers',
  MULTI_PROVIDER_LLM_HEALTH: '/api/admin/multi-provider-llm/health',
  MULTI_PROVIDER_LLM_TEMPLATES: '/api/admin/multi-provider-llm/templates',
} as const;

/**
 * 管理端API客户端类
 */
class AdminApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getAdminApiBaseUrl();
  }

  /**
   * 获取认证token
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;

    // 从persist storage中读取
    try {
      const stored = localStorage.getItem('admin-auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.state?.token || null;
      }
    } catch (error) {
      console.error('Failed to parse admin auth storage:', error);
    }

    return null;
  }

  /**
   * 构建完整的API URL
   */
  private buildUrl(endpoint: string): string {
    // 如果endpoint已经是完整URL，直接返回
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    
    // 如果是相对路径且baseUrl也是相对路径，直接拼接
    if (this.baseUrl.startsWith('/') && endpoint.startsWith('/')) {
      return endpoint;
    }
    
    // 其他情况拼接baseUrl
    return `${this.baseUrl}${endpoint}`;
  }

  /**
   * 通用请求方法
   */
  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = this.buildUrl(endpoint);
    const token = this.getAuthToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // 添加认证token
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('🚀 Admin API 请求:', {
      method: options.method || 'GET',
      url,
      hasToken: !!token,
      token: token ? `${token.substring(0, 20)}...` : 'null',
      baseUrl: this.baseUrl
    });

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      console.error('❌ Admin API 请求失败:', {
        status: response.status,
        statusText: response.statusText,
        url
      });
    }

    return response;
  }

  /**
   * GET请求
   */
  async get(endpoint: string): Promise<Response> {
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * POST请求
   */
  async post(endpoint: string, data?: any): Promise<Response> {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT请求
   */
  async put(endpoint: string, data?: any): Promise<Response> {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH请求
   */
  async patch(endpoint: string, data?: any): Promise<Response> {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE请求
   */
  async delete(endpoint: string): Promise<Response> {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * 带查询参数的GET请求
   */
  async getWithParams(endpoint: string, params: Record<string, any>): Promise<Response> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const url = queryParams.toString() 
      ? `${endpoint}?${queryParams.toString()}`
      : endpoint;

    return this.get(url);
  }
}

// 创建单例实例
export const adminApiClient = new AdminApiClient();

// 导出便捷方法
export const adminApi = {
  get: (endpoint: string) => adminApiClient.get(endpoint),
  post: (endpoint: string, data?: any) => adminApiClient.post(endpoint, data),
  put: (endpoint: string, data?: any) => adminApiClient.put(endpoint, data),
  patch: (endpoint: string, data?: any) => adminApiClient.patch(endpoint, data),
  delete: (endpoint: string) => adminApiClient.delete(endpoint),
  getWithParams: (endpoint: string, params: Record<string, any>) => 
    adminApiClient.getWithParams(endpoint, params),
}; 