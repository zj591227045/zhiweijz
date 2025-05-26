"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { authService } from "@/lib/auth-service";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean; // 是否需要认证
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // 如果store还没有初始化，等待
      if (!isInitialized) {
        return;
      }

      // 如果已经检查过，不再重复检查
      if (hasChecked) {
        return;
      }

      setHasChecked(true);

      // 如果需要认证
      if (requireAuth) {
        // 如果已经认证，直接通过
        if (isAuthenticated) {
          setIsChecking(false);
          return;
        }

        // 静默验证
        const isValid = await authService.silentCheck();

        if (!isValid) {
          // 验证失败，重定向到登录页
          router.replace(`/login?redirect=${encodeURIComponent(pathname || '')}`);
          return;
        }
      } else {
        // 不需要认证的页面（如登录、注册页）
        if (isAuthenticated) {
          // 如果已经认证，重定向到仪表盘
          const urlParams = new URLSearchParams(window.location.search);
          const redirectUrl = urlParams.get('redirect') || '/dashboard';
          router.replace(redirectUrl);
          return;
        }

        // 静默验证，如果有有效token则重定向
        const isValid = await authService.silentCheck();
        if (isValid) {
          const urlParams = new URLSearchParams(window.location.search);
          const redirectUrl = urlParams.get('redirect') || '/dashboard';
          router.replace(redirectUrl);
          return;
        }
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [isInitialized, isAuthenticated, requireAuth, router, pathname, hasChecked]);

  // 在检查过程中或store未初始化时显示空白内容
  if (!isInitialized || isChecking) {
    return null;
  }

  return <>{children}</>;
} 