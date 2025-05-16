'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';

// 公开路由列表
const publicRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

// 认证保护组件
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, token, fetchUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // 如果有token但未认证，尝试获取用户信息
      if (token && !isAuthenticated) {
        await fetchUser();
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, [token, isAuthenticated, fetchUser]);

  useEffect(() => {
    if (!isLoading) {
      // 如果未认证且不是公开路由，重定向到登录页
      if (!isAuthenticated && !publicRoutes.includes(pathname)) {
        router.push('/auth/login');
      }
      
      // 如果已认证且是公开路由，重定向到仪表盘
      if (isAuthenticated && publicRoutes.includes(pathname)) {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, pathname, router, isLoading]);

  // 加载中
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 如果未认证且不是公开路由，或已认证且是公开路由，不渲染子组件
  if (
    (!isAuthenticated && !publicRoutes.includes(pathname)) ||
    (isAuthenticated && publicRoutes.includes(pathname))
  ) {
    return null;
  }

  return <>{children}</>;
}
