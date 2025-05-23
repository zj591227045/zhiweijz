import { AuthResponse, LoginCredentials, RegisterData, User } from "../models";
import { StorageAdapter } from "../models/common";

export interface AuthServiceOptions {
  apiClient: any;
  storage: StorageAdapter;
  onAuthStateChange?: (isAuthenticated: boolean, user: User | null) => void;
}

export class AuthService {
  private apiClient: any;
  private storage: StorageAdapter;
  private onAuthStateChange?: (isAuthenticated: boolean, user: User | null) => void;
  private refreshPromise: Promise<string | null> | null = null;
  private refreshing = false;

  constructor(options: AuthServiceOptions) {
    this.apiClient = options.apiClient;
    this.storage = options.storage;
    this.onAuthStateChange = options.onAuthStateChange;
  }

  // 登录
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.apiClient.post("/auth/login", credentials) as AuthResponse;

    if (response && response.token) {
      // 保存token到存储
      await this.storage.setItem("auth-token", response.token);

      // 通知认证状态变化
      if (this.onAuthStateChange) {
        this.onAuthStateChange(true, response.user);
      }
    }

    return response;
  }

  // 注册
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.apiClient.post("/auth/register", data) as AuthResponse;

    if (response && response.token) {
      // 保存token到存储
      await this.storage.setItem("auth-token", response.token);

      // 通知认证状态变化
      if (this.onAuthStateChange) {
        this.onAuthStateChange(true, response.user);
      }
    }

    return response;
  }

  // 登出
  async logout(): Promise<void> {
    try {
      // 调用后端API登出
      await this.apiClient.post("/auth/logout");
    } catch (error) {
      console.error("登出失败", error);
    } finally {
      // 清除认证状态
      await this.clearAuth();
    }
  }

  // 检查token是否有效
  async checkToken(): Promise<boolean> {
    try {
      // 从存储获取token
      const token = await this.storage.getItem("auth-token");

      // 如果没有token，直接返回false
      if (!token) {
        return false;
      }

      // 调用后端API检查token是否有效
      await this.apiClient.get("/auth/check", {
        useCache: false, // 不使用缓存
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return true;
    } catch (error) {
      // 如果API调用失败，说明token无效
      return false;
    }
  }

  // 刷新token
  async refreshToken(): Promise<string | null> {
    // 如果已经在刷新中，返回现有的promise
    if (this.refreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshing = true;

    // 创建新的刷新promise
    this.refreshPromise = new Promise<string | null>(async (resolve) => {
      try {
        // 从存储获取token
        const currentToken = await this.storage.getItem("auth-token");

        // 如果没有token，直接返回null
        if (!currentToken) {
          resolve(null);
          return;
        }

        // 调用后端API刷新token
        const response = await this.apiClient.post("/auth/refresh", {}, {
          headers: {
            Authorization: `Bearer ${currentToken}`
          }
        }) as AuthResponse;

        // 更新存储中的token
        if (response && response.token) {
          await this.storage.setItem("auth-token", response.token);

          // 通知认证状态变化
          if (this.onAuthStateChange) {
            this.onAuthStateChange(true, response.user);
          }

          resolve(response.token);
        } else {
          resolve(null);
        }
      } catch (error) {
        // 如果刷新失败，清除认证状态
        await this.clearAuth();
        resolve(null);
      } finally {
        this.refreshing = false;
      }
    });

    return this.refreshPromise;
  }

  // 静默验证
  async silentCheck(): Promise<boolean> {
    // 检查token是否有效
    const isValid = await this.checkToken();

    // 如果token有效，直接返回true
    if (isValid) {
      return true;
    }

    // 如果token无效，尝试刷新
    const newToken = await this.refreshToken();

    // 如果刷新成功，返回true
    return !!newToken;
  }

  // 清除认证状态
  async clearAuth(): Promise<void> {
    // 清除存储中的token
    await this.storage.removeItem("auth-token");

    // 通知认证状态变化
    if (this.onAuthStateChange) {
      this.onAuthStateChange(false, null);
    }
  }
}
