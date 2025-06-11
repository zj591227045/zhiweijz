'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { clearAuthCache } from '@/utils/cache-utils';

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * 路由守卫组件
 * 负责在路由变化时检查认证状态，并在必要时清理缓存
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, token } = useAuthStore();

  useEffect(() => {
    // 管理员页面有自己的认证系统，不处理
    const isAdminPage = pathname.startsWith('/admin');
    if (isAdminPage) {
      return;
    }

    // 检查是否在认证页面
    const isAuthPage = pathname.startsWith('/auth/');

    // 如果在认证页面且已登录，重定向到仪表盘
    if (isAuthPage && isAuthenticated) {
      router.push('/dashboard');
      return;
    }

    // 如果不在认证页面且未登录，重定向到登录页
    if (!isAuthPage && !isAuthenticated) {
      // 清理可能残留的无效缓存
      clearAuthCache();
      router.push('/auth/login');
      return;
    }

    // 如果已登录但用户信息不完整，可能是缓存问题
    if (isAuthenticated && (!user || !token)) {
      console.warn('认证状态异常，清理缓存并重新登录');
      clearAuthCache();
      router.push('/auth/login');
      return;
    }
  }, [pathname, isAuthenticated, user, token, router]);

  return <>{children}</>;
}

/**
 * 页面级别的认证检查Hook
 * 用于在特定页面中进行更细粒度的认证检查
 */
export function useAuthGuard() {
  const { isAuthenticated, user, token } = useAuthStore();
  const router = useRouter();

  const requireAuth = () => {
    if (!isAuthenticated || !user || !token) {
      console.warn('需要认证，清理缓存并跳转到登录页');
      clearAuthCache();
      router.push('/auth/login');
      return false;
    }
    return true;
  };

  const requireGuest = () => {
    if (isAuthenticated && user && token) {
      router.push('/dashboard');
      return false;
    }
    return true;
  };

  return {
    isAuthenticated,
    user,
    token,
    requireAuth,
    requireGuest,
  };
}
