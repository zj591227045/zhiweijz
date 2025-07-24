/**
 * 应用初始化组件
 * 在应用启动时自动初始化各种服务
 */

import React, { useEffect, useState } from 'react';
import { initializeApp, getPaymentSystemStatus } from '../lib/app-init';

interface AppInitializerProps {
  children: React.ReactNode;
}

export function AppInitializer({ children }: AppInitializerProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('🚀 [AppInitializer] 开始初始化应用...');
        await initializeApp();
        console.log('🚀 [AppInitializer] 应用初始化完成');
        
        // 输出系统状态（仅开发环境）
        if (process.env.NODE_ENV === 'development') {
          const status = getPaymentSystemStatus();
          console.log('🚀 [AppInitializer] 系统状态:', status);
        }
        
      } catch (error) {
        console.error('🚀 [AppInitializer] 初始化失败:', error);
        setInitError(error instanceof Error ? error.message : '初始化失败');
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  // 显示初始化加载状态
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">正在初始化应用...</p>
        </div>
      </div>
    );
  }

  // 显示初始化错误
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">初始化失败</h2>
          <p className="text-gray-600 mb-4">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  // 初始化成功，渲染子组件
  return <>{children}</>;
}
