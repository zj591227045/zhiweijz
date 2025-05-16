"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TransactionEditPage } from "@/components/transactions/transaction-edit-page";
import { useAuthStore } from "@/store/auth-store";

export default function EditTransactionPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // 检查用户是否已认证
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return <TransactionEditPage />;
}
