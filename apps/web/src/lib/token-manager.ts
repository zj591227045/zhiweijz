/**
 * Token管理工具
 * 提供主动token刷新、状态监控等功能
 */

import { apiClient } from './api-client';

interface TokenStatus {
  needsRefresh: boolean;
  remainingTime: number;
  user?: any;
}

class TokenManager {
  private refreshTimer: NodeJS.Timeout | null = null;
  private statusCheckTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  private listeners: Array<(isValid: boolean) => void> = [];

  /**
   * 启动token监控
   */
  startMonitoring(): void {
    this.stopMonitoring(); // 先停止现有监控
    
    // 立即检查一次token状态
    this.checkTokenStatus();
    
    // 每5分钟检查一次token状态
    this.statusCheckTimer = setInterval(() => {
      this.checkTokenStatus();
    }, 5 * 60 * 1000);
  }

  /**
   * 停止token监控
   */
  stopMonitoring(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    if (this.statusCheckTimer) {
      clearInterval(this.statusCheckTimer);
      this.statusCheckTimer = null;
    }
  }

  /**
   * 检查token状态
   */
  private async checkTokenStatus(): Promise<void> {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        // 没有token时不通知监听器，避免误触发登出
        console.log('📍 没有token，跳过状态检查');
        return;
      }

      const response = await apiClient.get('/auth/token-status');

      // 检查响应数据是否有效（注意：apiClient已经返回了response.data）
      if (!response) {
        console.error('❌ Token状态检查响应无效:', response);
        return;
      }

      const status: TokenStatus = response;

      // 检查status对象是否包含必要的属性
      if (typeof status.needsRefresh === 'undefined' || typeof status.remainingTime === 'undefined') {
        console.error('❌ Token状态响应格式无效:', {
          status,
          needsRefreshType: typeof status.needsRefresh,
          remainingTimeType: typeof status.remainingTime,
          statusKeys: Object.keys(status || {})
        });
        return;
      }

      if (status.needsRefresh) {
        console.log('🔄 Token需要刷新，剩余时间:', status.remainingTime, '秒');
        await this.refreshToken();
      } else {
        // 确保remainingTime是有效的数字
        const remainingTime = Number(status.remainingTime);
        if (isNaN(remainingTime) || remainingTime <= 0) {
          console.warn('⚠️ Token剩余时间无效，使用默认检查间隔');
          // 使用默认的5分钟检查间隔
          const defaultCheckTime = 5 * 60 * 1000;

          if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
          }

          this.refreshTimer = setTimeout(() => {
            this.checkTokenStatus();
          }, defaultCheckTime);

          console.log('✅ Token状态正常（使用默认间隔），下次检查时间: 5分钟后');
        } else {
          // 计算下次检查时间（剩余时间的一半，但不超过30分钟）
          const nextCheckTime = Math.min(remainingTime * 500, 30 * 60 * 1000);

          if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
          }

          this.refreshTimer = setTimeout(() => {
            this.checkTokenStatus();
          }, nextCheckTime);

          console.log('✅ Token状态正常，下次检查时间:', Math.round(nextCheckTime / 1000), '秒后');
        }
      }

      this.notifyListeners(true);
    } catch (error) {
      console.error('检查token状态失败:', error);
      // 只有在确实是认证错误时才通知失效
      if (error.response?.status === 401) {
        this.notifyListeners(false);
      }
    }
  }

  /**
   * 刷新token
   */
  async refreshToken(): Promise<boolean> {
    // 如果已经在刷新中，返回现有的promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    
    this.refreshPromise = new Promise<boolean>(async (resolve) => {
      try {
        console.log('🔄 开始刷新token...');
        const response = await apiClient.post('/auth/refresh');
        
        if (response.data?.token) {
          localStorage.setItem('auth-token', response.data.token);
          console.log('✅ Token刷新成功');
          
          // 刷新成功后，重新开始监控
          this.checkTokenStatus();
          
          this.notifyListeners(true);
          resolve(true);
        } else {
          console.error('❌ Token刷新失败：响应中没有token');
          this.handleRefreshFailure();
          resolve(false);
        }
      } catch (error: any) {
        console.error('❌ Token刷新失败:', error);

        // 检查错误类型
        const isNetworkError = !error.response;
        const isServerError = error.response?.status >= 500;
        const isUnauthorized = error.response?.status === 401;

        if (isNetworkError) {
          console.log('🌐 网络错误，稍后重试');
          // 网络错误时不清除认证数据，5分钟后重试
          setTimeout(() => {
            this.checkTokenStatus();
          }, 5 * 60 * 1000);
        } else if (isServerError) {
          console.log('🔧 服务器错误，稍后重试');
          // 服务器错误时不清除认证数据，2分钟后重试
          setTimeout(() => {
            this.checkTokenStatus();
          }, 2 * 60 * 1000);
        } else if (isUnauthorized) {
          console.log('🚨 认证失败，清除认证数据');
          this.handleRefreshFailure();
        } else {
          console.log('❓ 未知错误，清除认证数据');
          this.handleRefreshFailure();
        }

        resolve(false);
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    });

    return this.refreshPromise;
  }

  /**
   * 处理刷新失败
   */
  private handleRefreshFailure(): void {
    this.stopMonitoring();
    this.clearAuthData();
    this.notifyListeners(false);
  }

  /**
   * 清除认证数据
   */
  private clearAuthData(): void {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth-storage');
    localStorage.removeItem('account-book-storage');
  }

  /**
   * 添加状态监听器
   */
  addListener(callback: (isValid: boolean) => void): void {
    this.listeners.push(callback);
  }

  /**
   * 移除状态监听器
   */
  removeListener(callback: (isValid: boolean) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(isValid: boolean): void {
    this.listeners.forEach(callback => {
      try {
        callback(isValid);
      } catch (error) {
        console.error('Token状态监听器执行失败:', error);
      }
    });
  }

  /**
   * 手动触发token检查
   */
  async checkNow(): Promise<boolean> {
    try {
      await this.checkTokenStatus();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取当前token状态
   */
  async getCurrentStatus(): Promise<TokenStatus | null> {
    try {
      const response = await apiClient.get('/auth/token-status');

      // 检查响应数据是否有效（注意：apiClient已经返回了response.data）
      if (!response) {
        console.error('❌ Token状态检查响应无效:', response);
        return null;
      }

      const status = response;

      // 检查status对象是否包含必要的属性
      if (typeof status.needsRefresh === 'undefined' || typeof status.remainingTime === 'undefined') {
        console.error('❌ Token状态响应格式无效:', {
          status,
          needsRefreshType: typeof status.needsRefresh,
          remainingTimeType: typeof status.remainingTime,
          statusKeys: Object.keys(status || {})
        });
        return null;
      }

      return status;
    } catch (error) {
      console.error('获取token状态失败:', error);
      return null;
    }
  }
}

// 创建全局实例
export const tokenManager = new TokenManager();

// 不在页面加载时自动启动监控
// 改为由TokenMonitorProvider在认证状态确认后启动
