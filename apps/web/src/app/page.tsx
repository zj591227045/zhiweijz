"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // 如果已登录，跳转到仪表盘页面
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      // 如果未登录，跳转到登录页面
      router.push("/auth/login");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-4">只为记账</h1>
        <p className="text-gray-500 mb-8">简单高效的个人记账应用</p>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}
