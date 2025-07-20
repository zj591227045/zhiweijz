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

  // 标准化路径，移除尾部斜杠
  const normalizedPath = pathname?.replace(/\/$/, '') || '';
  const isLoginPage = normalizedPath === '/admin/login';

  // 添加调试信息
  useEffect(() => {
    console.log('🔍 [AdminAuthGuard] Component mounted for path:', pathname);
  }, []);

  useEffect(() => {
    const verifyAuth = async () => {
      // 如果在登录页面且没有token，直接完成加载
      if (isLoginPage && !token) {
        setIsLoading(false);
        return;
      }

      // 如果没有token且不在登录页面，跳转到登录页
      if (!token) {
        setIsLoading(false);
        if (!isLoginPage) {
          router.push('/admin/login');
        }
        return;
      }

      // 如果有token，验证token有效性
      try {
        await checkAuth();
        setIsLoading(false);

        // 如果认证成功且在登录页面，跳转到管理页面
        if (isLoginPage) {
          router.push('/admin');
        }
      } catch (error) {
        setIsLoading(false);

        // 认证失败，跳转到登录页面
        if (!isLoginPage) {
          router.push('/admin/login');
        }
      }
    };

    verifyAuth();
  }, [token, checkAuth, router, isLoginPage, pathname, normalizedPath]);

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

  // 如果在登录页面，直接显示登录页面内容
  if (isLoginPage) {
    return <>{children}</>;
  }

  // 如果不在登录页面但未认证，显示跳转提示
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">跳转到登录页...</p>
        </div>
      </div>
    );
  }

  // 已认证，显示受保护的内容
  return <>{children}</>;
}
