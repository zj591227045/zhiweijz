/**
 * 开发环境调试工具
 * 仅在开发环境下启用，用于调试认证相关功能
 */

declare global {
  interface Window {
    __DEBUG_AUTH__: any;
  }
}

// 仅在开发环境下执行
if (process.env.NODE_ENV === 'development') {
  // 创建调试对象
  const debugAuth = {
    // 获取当前认证状态
    getAuthState: () => {
      try {
        const token = localStorage.getItem('accessToken');
        const user = localStorage.getItem('user');
        return {
          token: token ? 'exists' : null,
          user: user ? JSON.parse(user) : null,
        };
      } catch (error) {
        console.error('获取认证状态失败:', error);
        return null;
      }
    },

    // 清除认证数据
    clearAuth: () => {
      try {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('currentAccountBook');
        console.log('🔧 调试: 已清除所有认证数据');
      } catch (error) {
        console.error('清除认证数据失败:', error);
      }
    },

    // 查看当前存储的数据
    getStorageData: () => {
      const data: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            data[key] = JSON.parse(localStorage.getItem(key) || '');
          } catch {
            data[key] = localStorage.getItem(key);
          }
        }
      }
      return data;
    },

    // 输出调试信息
    info: () => {
      console.group('🔧 Auth Debug Info');
      console.log('Auth State:', debugAuth.getAuthState());
      console.log('Storage Data:', debugAuth.getStorageData());
      console.groupEnd();
    },
  };

  // 将调试工具挂载到 window 对象
  if (typeof window !== 'undefined') {
    window.__DEBUG_AUTH__ = debugAuth;
    
    // 在控制台输出调试工具说明
    console.log('🔧 认证调试工具已加载');
    console.log('可用命令:');
    console.log('  __DEBUG_AUTH__.getAuthState() - 获取认证状态');
    console.log('  __DEBUG_AUTH__.clearAuth() - 清除认证数据');
    console.log('  __DEBUG_AUTH__.getStorageData() - 查看存储数据');
    console.log('  __DEBUG_AUTH__.info() - 输出调试信息');
  }
}

export {}; 