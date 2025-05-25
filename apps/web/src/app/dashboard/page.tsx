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
    refreshDashboardData,
    setupTransactionListener,
    cleanupTransactionListener
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

  // 设置交易变化监听器
  useEffect(() => {
    console.log("仪表盘页面：设置交易变化监听器");
    setupTransactionListener();
    
    return () => {
      console.log("仪表盘页面：清理交易变化监听器");
      cleanupTransactionListener();
    };
  }, [setupTransactionListener, cleanupTransactionListener]);

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

    // 监听localStorage变化（用于跨标签页同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dashboard_refresh_signal' && e.newValue && currentAccountBook?.id) {
        try {
          const signal = JSON.parse(e.newValue);
          console.log("监听到localStorage刷新信号:", signal);
          
          // 检查信号是否是最近5秒内的
          if (Date.now() - signal.timestamp < 5000 && signal.accountBookId === currentAccountBook.id) {
            console.log("根据storage事件刷新仪表盘数据");
            refreshDashboardData(signal.accountBookId);
          }
        } catch (error) {
          console.error("处理storage事件失败:", error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentAccountBook, refreshDashboardData]);

  // 监听路由变化，当进入仪表盘页面时刷新数据并重新设置监听器
  useEffect(() => {
    if (pathname === '/dashboard') {
      console.log("进入仪表盘页面，重新设置监听器并刷新数据");
      
      // 重新设置监听器
      setupTransactionListener();
      
      // 检查localStorage中的刷新信号
      const checkRefreshSignal = () => {
        try {
          const signalStr = localStorage.getItem('dashboard_refresh_signal');
          if (signalStr) {
            const signal = JSON.parse(signalStr);
            console.log("检测到仪表盘刷新信号:", signal);
            
            // 检查信号是否是最近5秒内的（避免处理过期信号）
            if (Date.now() - signal.timestamp < 5000) {
              console.log("处理仪表盘刷新信号，账本ID:", signal.accountBookId);
              
              // 清除信号
              localStorage.removeItem('dashboard_refresh_signal');
              
              // 刷新数据
              if (signal.accountBookId && currentAccountBook?.id === signal.accountBookId) {
                console.log("根据localStorage信号刷新仪表盘数据");
                refreshDashboardData(signal.accountBookId);
                return true; // 表示已处理刷新信号
              }
            } else {
              // 清除过期信号
              localStorage.removeItem('dashboard_refresh_signal');
              console.log("清除过期的仪表盘刷新信号");
            }
          }
        } catch (error) {
          console.error("处理仪表盘刷新信号失败:", error);
          localStorage.removeItem('dashboard_refresh_signal');
        }
        return false;
      };
      
      // 检查刷新信号
      const signalProcessed = checkRefreshSignal();
      
      // 如果没有处理刷新信号，则正常刷新数据
      if (!signalProcessed && currentAccountBook?.id) {
        console.log("正常刷新仪表盘数据，账本ID:", currentAccountBook.id);
        refreshDashboardData(currentAccountBook.id);
      }
    }
  }, [pathname, currentAccountBook, refreshDashboardData, setupTransactionListener]);

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
