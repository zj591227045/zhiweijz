"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { MainLayout } from "./main-layout";
import { useAccountBookStore } from "@/store/account-book-store";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { fetchAccountBooks, accountBooks, currentAccountBook } = useAccountBookStore();
  const pathname = usePathname();

  // 获取账本列表
  useEffect(() => {
    fetchAccountBooks();
  }, [fetchAccountBooks]);

  return (
    <MainLayout>
      <div className="container py-6">
        {/* 账本选择器 */}
        {accountBooks.length > 0 && (
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-muted-foreground">当前账本:</span>
              <select
                value={currentAccountBook?.id || ""}
                onChange={(e) => useAccountBookStore.getState().setCurrentAccountBook(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {accountBooks.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.name} {book.isDefault ? "(默认)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 主内容 */}
        {children}
      </div>
    </MainLayout>
  );
}
