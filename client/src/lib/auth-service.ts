import { apiClient } from "./api";
import { useAuthStore } from "@/store/auth-store";
import { AuthResponse } from "@/types";

// 认证服务
class AuthService {
  private refreshPromise: Promise<string | null> | null = null;
  private refreshing = false;
  private lastCheckTime = 0;
  private checkCacheDuration = 30000; // 30秒缓存

  // 检查token是否有效（带缓存）
  async checkToken(): Promise<boolean> {
    try {
      // 首先从store获取token
      let token = useAuthStore.getState().token;
      
      // 如果store中没有token，尝试从localStorage获取
      if (!token && typeof window !== 'undefined') {
        token = localStorage.getItem("auth-token");
      }
      
      // 如果仍然没有token，直接返回false
      if (!token) {
        return false;
      }

      // 检查缓存，如果最近检查过且成功，直接返回true
      const now = Date.now();
      if (now - this.lastCheckTime < this.checkCacheDuration) {
        const currentState = useAuthStore.getState();
        if (currentState.isAuthenticated && currentState.token === token) {
          return true;
        }
      }
      
      // 调用后端API检查token是否有效
      const response = await apiClient.get("/auth/check", {
        useCache: false, // 不使用缓存
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // 更新最后检查时间
      this.lastCheckTime = now;
      
      // 如果token有效且store中没有认证状态，同步更新store
      const currentState = useAuthStore.getState();
      if (!currentState.isAuthenticated && token) {
        // 这里我们只设置token和认证状态，用户信息可以通过其他API获取
        useAuthStore.setState({
          token,
          isAuthenticated: true
        });
      }
      
      return true;
    } catch (error) {
      // 如果API调用失败，说明token无效
      this.lastCheckTime = 0; // 清除缓存
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
        // 首先从store获取token
        let currentToken = useAuthStore.getState().token;
        
        // 如果store中没有token，尝试从localStorage获取
        if (!currentToken && typeof window !== 'undefined') {
          currentToken = localStorage.getItem("auth-token");
        }
        
        // 如果没有token，直接返回null
        if (!currentToken) {
          resolve(null);
          return;
        }
        
        // 调用后端API刷新token
        const response = await apiClient.post<AuthResponse>("/auth/refresh", {}, {
          headers: {
            Authorization: `Bearer ${currentToken}`
          }
        });
        
        // 更新store中的token
        if (response && response.token) {
          useAuthStore.setState({
            token: response.token,
            user: response.user,
            isAuthenticated: true
          });
          
          // 更新localStorage中的token
          localStorage.setItem("auth-token", response.token);
          
          // 更新最后检查时间
          this.lastCheckTime = Date.now();
          
          resolve(response.token);
        } else {
          resolve(null);
        }
      } catch (error) {
        // 如果刷新失败，清除认证状态
        this.clearAuth();
        resolve(null);
      } finally {
        this.refreshing = false;
      }
    });
    
    return this.refreshPromise;
  }

  // 静默验证（简化版本）
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
  clearAuth(): void {
    // 清除localStorage中的token
    localStorage.removeItem("auth-token");
    localStorage.removeItem("user");
    
    // 清除缓存
    this.lastCheckTime = 0;
    
    // 清除store中的认证状态
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false
    });
  }
}

// 创建单例实例
export const authService = new AuthService();
