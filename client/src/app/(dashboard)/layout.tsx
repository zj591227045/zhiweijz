"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { authService } from "@/lib/auth-service";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  // 使用静默验证检查认证状态
  useEffect(() => {
    const checkAuth = async () => {
      // 如果已经认证，不需要检查
      if (isAuthenticated) {
        setIsChecking(false);
        return;
      }

      // 静默验证
      const isValid = await authService.silentCheck();

      // 如果验证失败且不在首页，重定向到登录页
      if (!isValid && pathname !== "/") {
        // 使用replace而不是push，避免在历史记录中添加当前页面
        router.replace(`/login?redirect=${encodeURIComponent(pathname || '')}`);
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [isAuthenticated, router, pathname]);

  // 在验证过程中显示空白内容
  if (isChecking) {
    return null;
  }

  return <>{children}</>;
}
