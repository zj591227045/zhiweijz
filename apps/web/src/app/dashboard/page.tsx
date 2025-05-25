"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const { currentAccountBook, fetchAccountBooks } = useAccountBookStore();
  const { 
    monthlyStats, 
    budgetCategories, 
    totalBudget, 
    groupedTransactions, 
    isLoading, 
    error,
    fetchDashboardData,
    refreshDashboardData 
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

  // 监听页面可见性变化，当页面重新获得焦点时刷新数据
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentAccountBook?.id) {
        console.log("页面重新获得焦点，刷新仪表盘数据");
        refreshDashboardData(currentAccountBook.id);
      }
    };

    const handleFocus = () => {
      if (currentAccountBook?.id) {
        console.log("窗口重新获得焦点，刷新仪表盘数据");
        refreshDashboardData(currentAccountBook.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentAccountBook, refreshDashboardData]);

  // 监听路由变化，当进入仪表盘页面时刷新数据
  useEffect(() => {
    if (pathname === '/dashboard' && currentAccountBook?.id) {
      console.log("进入仪表盘页面，刷新数据");
      refreshDashboardData(currentAccountBook.id);
    }
  }, [pathname, currentAccountBook, refreshDashboardData]);

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
