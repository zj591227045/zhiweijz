"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore, useAccountBookStore } from "@zhiweijz/web";
import { PageContainer } from "@/components/layout/page-container";
import { MonthlyOverview } from "@/components/dashboard/monthly-overview";
import { BudgetProgress } from "@/components/dashboard/budget-progress";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { accountBookService, statisticsService, budgetService, transactionService } from "@/lib/api-services";
import dayjs from "dayjs";
import { TransactionType } from "@/components/dashboard/recent-transactions";
import { useDashboardStore } from "@/store/dashboard-store";

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { currentAccountBook, fetchAccountBooks } = useAccountBookStore();
  const { 
    monthlyStats, 
    budgetCategories, 
    totalBudget, 
    groupedTransactions, 
    isLoading, 
    error,
    fetchDashboardData 
  } = useDashboardStore();

  useEffect(() => {
    // 检查用户是否已登录
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    // 获取账本列表
    fetchAccountBooks();

    // 如果有当前账本，获取仪表盘数据
    if (currentAccountBook?.id) {
      fetchDashboardData(currentAccountBook.id);
    }
  }, [isAuthenticated, router, fetchAccountBooks, currentAccountBook, fetchDashboardData]);

  // 右侧操作按钮
  const rightActions = (
    <>
      <button className="icon-button">
        <i className="fas fa-bell"></i>
      </button>
    </>
  );

  return (
    <PageContainer title="仪表盘" rightActions={rightActions} activeNavItem="home">

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div
            className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
            style={{ borderColor: 'var(--primary-color)' }}
          ></div>
        </div>
      ) : error ? (
        <div
          className="px-4 py-3 rounded mb-4"
          style={{
            backgroundColor: 'rgba(var(--error-color), 0.1)',
            borderColor: 'var(--error-color)',
            color: 'var(--error-color)',
            border: '1px solid'
          }}
        >
          {error}
        </div>
      ) : (
        <>
          {/* 月度概览 */}
          <MonthlyOverview
            income={monthlyStats.income}
            expense={monthlyStats.expense}
            balance={monthlyStats.balance}
            month={monthlyStats.month}
          />

          {/* 预算执行情况 */}
          <BudgetProgress
            categories={budgetCategories}
            totalBudget={totalBudget}
          />

          {/* 最近交易 */}
          <RecentTransactions
            groupedTransactions={groupedTransactions}
          />
        </>
      )}
    </PageContainer>
  );
}
