'use client';

import { useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';

interface AuthInitializerProps {
  children: ReactNode;
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  const pathname = usePathname();
  const { setLoading } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      // 管理员页面使用独立的认证系统，跳过普通用户认证初始化
      const isAdminPage = pathname?.startsWith('/admin');
      if (isAdminPage) {
        return;
      }

      setLoading(true);
      
      try {
        const token = localStorage.getItem('auth-token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
          try {
            // 验证token是否仍然有效
            const userData = await apiClient.get('/auth/check');

            if (userData) {
              // Token有效，认证状态已通过zustand persist恢复
              console.log('✅ 用户认证状态已验证并恢复');
            } else {
              // Token无效，清除所有认证数据
              console.log('❌ Token验证失败，清除认证状态');
              localStorage.removeItem('auth-token');
              localStorage.removeItem('user');
              localStorage.removeItem('auth-storage');
            }
          } catch (error) {
            console.error('⚠️ 验证用户状态失败:', error);

            // 检查错误类型，只有在确实是认证错误时才清除数据
            if (error.response?.status === 401) {
              console.log('🚨 认证错误，清除认证数据');
              localStorage.removeItem('auth-token');
              localStorage.removeItem('user');
              localStorage.removeItem('auth-storage');
            } else {
              console.log('🌐 网络或服务器错误，保留认证数据');
              // 网络错误或服务器错误时不清除认证数据
            }
          }
        }
      } catch (error) {
        console.error('认证初始化失败:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [setLoading, pathname]);

  return <>{children}</>;
}
