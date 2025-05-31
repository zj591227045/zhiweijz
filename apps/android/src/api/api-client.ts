import { AsyncStorageAdapter, STORAGE_KEYS } from '../adapters/storage-adapter';

/**
 * API配置
 */
const API_CONFIG = {
  BASE_URL: 'http://10.255.0.97/api',
  TIMEOUT: 10000, // 10秒超时
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000, // 1秒重试延迟
};

/**
 * HTTP方法类型
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * 请求选项接口
 */
interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  [key: string]: any;
}

/**
 * API响应接口
 */
interface ApiResponse<T = any> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * Android端API客户端
 * 提供统一的HTTP请求接口，支持认证、重试、超时等功能
 */
export class AndroidApiClient {
  private storage: AsyncStorageAdapter;
  private baseURL: string;
  private defaultTimeout: number;

  constructor(storage: AsyncStorageAdapter, baseURL?: string) {
    this.storage = storage;
    this.baseURL = baseURL || API_CONFIG.BASE_URL;
    this.defaultTimeout = API_CONFIG.TIMEOUT;
  }

  /**
   * 获取认证头
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const token = await this.storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        return {
          'Authorization': `Bearer ${token}`,
        };
      }
    } catch (error) {
      console.error('[ApiClient] 获取认证头失败:', error);
    }
    return {};
  }

  /**
   * 设置认证令牌
   */
  async setAuthToken(token: string): Promise<void> {
    try {
      await this.storage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      console.log('[ApiClient] 认证令牌已设置');
    } catch (error) {
      console.error('[ApiClient] 设置认证令牌失败:', error);
      throw error;
    }
  }

  /**
   * 清除认证令牌
   */
  async clearAuthToken(): Promise<void> {
    try {
      await this.storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      console.log('[ApiClient] 认证令牌已清除');
    } catch (error) {
      console.error('[ApiClient] 清除认证令牌失败:', error);
    }
  }

  /**
   * 执行HTTP请求
   */
  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      headers = {},
      timeout = this.defaultTimeout,
      retries = API_CONFIG.RETRY_COUNT,
      ...otherOptions
    } = options;

    // 构建请求URL
    const url = `${this.baseURL}${endpoint}`;

    // 获取认证头
    const authHeaders = await this.getAuthHeaders();

    // 构建请求配置
    const requestConfig: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...headers,
      },
      ...otherOptions,
    };

    // 添加请求体（对于POST、PUT、PATCH请求）
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestConfig.body = JSON.stringify(data);
    }

    // 执行请求（带重试机制）
    let lastError: Error;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`[ApiClient] ${method} ${url} (尝试 ${attempt + 1}/${retries + 1})`);

        // 创建超时控制器
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // 执行请求
        const response = await fetch(url, {
          ...requestConfig,
          signal: controller.signal,
        });

        // 清除超时
        clearTimeout(timeoutId);

        // 检查响应状态
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          (error as any).status = response.status;
          (error as any).response = { data: errorData };
          throw error;
        }

        // 解析响应
        const result = await response.json();
        console.log(`[ApiClient] ${method} ${url} 成功`);
        return result;

      } catch (error: any) {
        lastError = error;
        console.error(`[ApiClient] ${method} ${url} 失败 (尝试 ${attempt + 1}):`, error.message);

        // 如果是最后一次尝试，或者是认证错误，不再重试
        if (attempt === retries || error.status === 401) {
          break;
        }

        // 等待后重试
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY * (attempt + 1)));
        }
      }
    }

    // 处理认证错误
    if (lastError && (lastError as any).status === 401) {
      console.warn('[ApiClient] 认证失败，清除本地认证信息');
      await this.clearAuthToken();
    }

    throw lastError;
  }

  /**
   * GET请求
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  /**
   * POST请求
   */
  async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', endpoint, data, options);
  }

  /**
   * PUT请求
   */
  async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  /**
   * DELETE请求
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  /**
   * PATCH请求
   */
  async patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  /**
   * 检查网络连接
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.get('/health', { timeout: 5000, retries: 0 });
      return true;
    } catch (error) {
      console.warn('[ApiClient] 网络连接检查失败:', error);
      return false;
    }
  }

  /**
   * 获取API基础URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * 设置API基础URL
   */
  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
    console.log(`[ApiClient] API基础URL已设置为: ${baseURL}`);
  }
}

/**
 * 创建API客户端实例
 */
export function createApiClient(storage: AsyncStorageAdapter, baseURL?: string): AndroidApiClient {
  return new AndroidApiClient(storage, baseURL);
}

/**
 * 默认API客户端实例（需要在使用前初始化）
 */
let defaultApiClient: AndroidApiClient | null = null;

/**
 * 初始化默认API客户端
 */
export function initializeApiClient(storage: AsyncStorageAdapter, baseURL?: string): AndroidApiClient {
  defaultApiClient = createApiClient(storage, baseURL);
  return defaultApiClient;
}

/**
 * 获取默认API客户端
 */
export function getApiClient(): AndroidApiClient {
  if (!defaultApiClient) {
    throw new Error('API客户端未初始化，请先调用 initializeApiClient()');
  }
  return defaultApiClient;
}
