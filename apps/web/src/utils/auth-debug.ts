/**
 * 认证调试工具
 * 用于诊断登录和认证状态问题
 */

import { useAuthStore } from '@/store/auth-store';

class AuthDebugger {
  private logs: Array<{ timestamp: Date; level: string; message: string; data?: any }> = [];

  /**
   * 记录调试日志
   */
  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
    };

    this.logs.push(logEntry);

    // 保持最近100条日志
    if (this.logs.length > 100) {
      this.logs.shift();
    }

    // 输出到控制台
    const timestamp = logEntry.timestamp.toLocaleTimeString();
    const prefix = `[AuthDebug ${timestamp}]`;

    switch (level) {
      case 'info':
        console.log(`${prefix} ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, data || '');
        break;
      case 'error':
        console.error(`${prefix} ${message}`, data || '');
        break;
    }
  }

  /**
   * 检查当前认证状态
   */
  checkAuthState(): void {
    const authState = useAuthStore.getState();
    const localStorage_token = localStorage.getItem('auth-token');
    const localStorage_user = localStorage.getItem('user');
    const localStorage_authStorage = localStorage.getItem('auth-storage');

    const report = {
      zustand_state: {
        isAuthenticated: authState.isAuthenticated,
        hasUser: !!authState.user,
        hasToken: !!authState.token,
        isLoading: authState.isLoading,
        error: authState.error,
      },
      localStorage: {
        hasToken: !!localStorage_token,
        hasUser: !!localStorage_user,
        hasAuthStorage: !!localStorage_authStorage,
        tokenPrefix: localStorage_token ? localStorage_token.substring(0, 20) + '...' : null,
      },
      consistency: {
        tokenMatch: authState.token === localStorage_token,
        userMatch: authState.user
          ? JSON.stringify(authState.user) === localStorage_user
          : !localStorage_user,
      },
    };

    //this.log('info', '认证状态检查', report);
    return report;
  }

  /**
   * 监控认证状态变化
   */
  startMonitoring(): () => void {
    this.log('info', '开始监控认证状态变化');

    let previousState = this.checkAuthState();

    const interval = setInterval(() => {
      const currentState = this.checkAuthState();

      // 检查是否有变化
      const hasChanges = JSON.stringify(currentState) !== JSON.stringify(previousState);

      if (hasChanges) {
        this.log('warn', '认证状态发生变化', {
          previous: previousState,
          current: currentState,
        });
        previousState = currentState;
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      this.log('info', '停止监控认证状态变化');
    };
  }

  /**
   * 模拟登录流程测试
   */
  async testLoginFlow(credentials: { email: string; password: string }): Promise<void> {
    this.log('info', '开始测试登录流程', { email: credentials.email });

    try {
      // 记录登录前状态
      this.log('info', '登录前状态', this.checkAuthState());

      // 执行登录
      const authStore = useAuthStore.getState();
      const success = await authStore.login(credentials);

      // 记录登录后状态
      setTimeout(() => {
        this.log('info', '登录后状态', this.checkAuthState());
      }, 100);

      this.log('info', '登录结果', { success });
    } catch (error) {
      this.log('error', '登录测试失败', error);
    }
  }

  /**
   * 清除所有认证数据
   */
  clearAllAuthData(): void {
    this.log('warn', '清除所有认证数据');

    // 清除localStorage
    localStorage.removeItem('auth-token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth-storage');
    localStorage.removeItem('account-book-storage');

    // 重置Zustand状态
    const authStore = useAuthStore.getState();
    authStore.logout();

    this.log('info', '认证数据清除完成', this.checkAuthState());
  }

  /**
   * 获取调试日志
   */
  getLogs(): Array<{ timestamp: Date; level: string; message: string; data?: any }> {
    return [...this.logs];
  }

  /**
   * 清除调试日志
   */
  clearLogs(): void {
    this.logs = [];
    console.log('[AuthDebug] 调试日志已清除');
  }

  /**
   * 导出调试报告
   */
  exportReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      authState: this.checkAuthState(),
      logs: this.logs,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 打印调试报告
   */
  printReport(): void {
    console.log('='.repeat(50));
    console.log('认证调试报告');
    console.log('='.repeat(50));

    const state = this.checkAuthState();
    console.table(state.zustand_state);
    console.table(state.localStorage);
    console.table(state.consistency);

    console.log('\n最近的日志:');
    this.logs.slice(-10).forEach((log) => {
      const time = log.timestamp.toLocaleTimeString();
      console.log(`[${time}] ${log.level.toUpperCase()}: ${log.message}`);
      if (log.data) {
        console.log('  数据:', log.data);
      }
    });

    console.log('='.repeat(50));
  }
}

// 创建全局实例
export const authDebugger = new AuthDebugger();

// 在开发环境下将调试工具添加到window对象
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).authDebugger = authDebugger;
  console.log('🔧 认证调试工具已加载，使用 window.authDebugger 访问');

  // 自动开始监控
  authDebugger.startMonitoring();
}
