'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminAuth } from '@/store/admin/useAdminAuth';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, checkAuth, token } = useAdminAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      if (!token) {
        setIsLoading(false);
        if (pathname !== '/admin/login') {
          router.push('/admin/login');
        }
        return;
      }

      try {
        await checkAuth();
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        if (pathname !== '/admin/login') {
          router.push('/admin/login');
        }
      }
    };

    verifyAuth();
  }, [token, checkAuth, router, pathname]);

  // 如果正在验证认证状态，显示加载界面
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">验证登录状态...</p>
        </div>
      </div>
    );
  }

  // 如果未认证且不在登录页面，重定向到登录页
  if (!isAuthenticated && pathname !== '/admin/login') {
    router.push('/admin/login');
    return null;
  }

  // 如果已认证且在登录页面，重定向到管理页面
  if (isAuthenticated && pathname === '/admin/login') {
    router.push('/admin');
    return null;
  }

  return <>{children}</>;
} 