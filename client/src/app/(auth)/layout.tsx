"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { authService } from "@/lib/auth-service";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  // 使用静默验证检查认证状态
  useEffect(() => {
    const checkAuth = async () => {
      // 如果已经认证，重定向到仪表盘或重定向URL
      if (isAuthenticated) {
        const redirectUrl = searchParams.get('redirect') || '/dashboard';
        router.replace(redirectUrl);
        return;
      }

      // 静默验证
      const isValid = await authService.silentCheck();

      // 如果验证成功，重定向到仪表盘或重定向URL
      if (isValid) {
        const redirectUrl = searchParams.get('redirect') || '/dashboard';
        router.replace(redirectUrl);
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [isAuthenticated, router, searchParams]);

  // 在验证过程中显示空白内容
  if (isChecking && isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
