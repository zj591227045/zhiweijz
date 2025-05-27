'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';

interface AuthInitializerProps {
  children: React.ReactNode;
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isAuthenticated, token, user } = useAuthStore();
  const setState = useAuthStore.setState;

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // 检查localStorage中是否有token
        const storedToken = localStorage.getItem('auth-token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          try {
            const userData = JSON.parse(storedUser);

            // 验证token是否仍然有效
            const response = await fetch('/api/auth/check', {
              headers: {
                'Authorization': `Bearer ${storedToken}`
              }
            });

            if (response.ok) {
              // Token有效，恢复认证状态
              setState({
                token: storedToken,
                user: userData,
                isAuthenticated: true,
                isLoading: false,
                error: null
              });
            } else {
              // Token无效，清除存储
              localStorage.removeItem('auth-token');
              localStorage.removeItem('user');
              setState({
                token: null,
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null
              });
            }
          } catch (error) {
            console.error('解析用户数据失败:', error);
            localStorage.removeItem('auth-token');
            localStorage.removeItem('user');
            setState({
              token: null,
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null
            });
          }
        } else {
          // 没有存储的认证信息
          setState({
            token: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('认证初始化失败:', error);
        setState({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  // 在初始化完成前显示加载状态
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">正在初始化...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
