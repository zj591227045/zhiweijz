"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated && pathname !== "/") {
      router.push("/login");
    }
  }, [isAuthenticated, router, pathname]);

  return <>{children}</>;
}
