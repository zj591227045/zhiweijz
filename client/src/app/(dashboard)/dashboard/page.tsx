"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useAccountBookStore } from "@/store/account-book-store";
import { toast } from "sonner";
import { startMeasure, endMeasure } from "@/lib/performance";
import "./dashboard.css";
import {
  BudgetStatistics,
  StatisticsResponse,
  TransactionGroup,
  Transaction
} from "@/types";
import {
  getFinancialOverview,
  getBudgetStatistics,
  getRecentTransactions,
  groupTransactionsByDate,
  getCurrentMonthString,
  getCurrentMonthRange
} from "@/lib/api-services";

// 导入组件
import { MonthlyOverview } from "@/components/dashboard/monthly-overview";
import { BudgetProgress } from "@/components/dashboard/budget-progress";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { DashboardSkeleton } from "@/components/dashboard/skeleton-loader";
import { PageContainer } from "@/components/layout/page-container";


export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { currentAccountBook, accountBooks, fetchAccountBooks } = useAccountBookStore();

  // 状态
  const [isLoading, setIsLoading] = useState(true);
  const [isDataReady, setIsDataReady] = useState(false); // 标记数据是否已准备好
  const [overview, setOverview] = useState<StatisticsResponse | null>(null);
  const [budgets, setBudgets] = useState<BudgetStatistics | null>(null);
  const [transactionGroups, setTransactionGroups] = useState<TransactionGroup[]>([]);
  const [currentMonth] = useState(getCurrentMonthString());

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // 获取账本列表
  useEffect(() => {
    if (isAuthenticated && accountBooks.length === 0) {
      // 仅在开发环境输出日志
      if (process.env.NODE_ENV === 'development') console.log("尝试获取账本列表...");
      fetchAccountBooks().catch((error: any) => {
        console.error("获取账本列表失败:", error);
        toast.error("获取账本列表失败，请稍后重试");
      });
    }
  }, [isAuthenticated, accountBooks.length, fetchAccountBooks]);

  // 预加载数据函数
  const prefetchDashboardData = async () => {
    try {
      // 仅在开发环境输出日志
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev) console.log("预加载仪表盘数据...");

      // 获取当前月份的日期范围
      const { startDate, endDate } = getCurrentMonthRange();
      const currentMonthStr = startDate.substring(0, 7); // YYYY-MM

      // 获取当前账本ID
      const accountBookId = currentAccountBook?.id;

      // 预加载数据但不等待结果
      getFinancialOverview(startDate, endDate, accountBookId).catch(() => {});
      getBudgetStatistics(currentMonthStr, accountBookId).catch(() => {});
      getRecentTransactions(10, accountBookId).catch(() => {});
    } catch (error) {
      // 忽略预加载错误
    }
  };

  // 在组件挂载时预加载数据
  useEffect(() => {
    if (isAuthenticated && currentAccountBook) {
      prefetchDashboardData();
    }
  }, [isAuthenticated, currentAccountBook]);

  // 获取仪表盘数据
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        // 开始性能测量
        startMeasure('dashboard_data_loading');

        // 仅在开发环境输出日志
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) {
          console.log("开始获取仪表盘数据");
          console.log("认证状态:", isAuthenticated);
          console.log("当前账本:", currentAccountBook);
        }

        // 如果没有账本，尝试获取账本列表
        if (accountBooks.length === 0) {
          if (isDev) console.log("没有账本，尝试获取账本列表...");
          await fetchAccountBooks();

          // 如果仍然没有账本，显示提示
          if (useAccountBookStore.getState().accountBooks.length === 0) {
            toast.error("您还没有账本，请先创建一个账本");
            setIsLoading(false);
            return;
          }
        }

        // 获取当前月份的日期范围
        const { startDate, endDate } = getCurrentMonthRange();
        const currentMonthStr = startDate.substring(0, 7); // YYYY-MM
        if (isDev) console.log("日期范围:", startDate, endDate);

        // 获取当前账本ID
        const accountBookId = currentAccountBook?.id;
        if (isDev) console.log("使用账本ID:", accountBookId);

        // 真正并行获取所有数据
        if (isDev) console.log("开始并行请求数据...");

        // 创建所有请求的Promise对象，但不等待它们
        const overviewPromise = getFinancialOverview(startDate, endDate, accountBookId)
          .catch(error => {
            console.error("获取财务概览数据失败:", error);
            return null;
          });

        const budgetPromise = getBudgetStatistics(currentMonthStr, accountBookId)
          .catch(error => {
            console.error("获取预算数据失败:", error);
            return null;
          });

        const transactionsPromise = getRecentTransactions(10, accountBookId)
          .catch(error => {
            console.error("获取交易数据失败:", error);
            return [];
          });

        // 使用Promise.all真正并行执行所有请求
        // 确保所有请求都已经启动，然后等待它们全部完成
        const [overviewData, budgetData, transactionsData] = await Promise.all([
          overviewPromise,
          budgetPromise,
          transactionsPromise
        ]);

        // 设置财务概览数据
        if (overviewData) {
          setOverview(overviewData);
        }

        // 设置预算数据
        if (budgetData) {
          setBudgets(budgetData);
        }

        // 设置交易数据
        if (Array.isArray(transactionsData)) {
          // 将交易记录按日期分组
          const grouped = groupTransactionsByDate(transactionsData);
          setTransactionGroups(grouped);
        } else {
          console.error("交易数据不是数组:", transactionsData);
          setTransactionGroups([]);
        }

        // 标记数据已准备好
        setIsDataReady(true);

      } catch (error) {
        console.error("获取仪表盘数据失败:", error);
        toast.error("获取仪表盘数据失败，请稍后重试");
      } finally {
        // 结束性能测量
        endMeasure('dashboard_data_loading');
        setIsLoading(false);
      }
    };

    // 只有在认证状态下才获取数据
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [currentAccountBook, isAuthenticated, accountBooks, fetchAccountBooks]);

  // 右侧操作按钮
  const rightActions = (
    <>
      <button className="icon-button">
        <i className="fas fa-bell"></i>
      </button>
    </>
  );

  return (
    <PageContainer title="仪表板" rightActions={rightActions} activeNavItem="home">
      {isLoading || !isDataReady ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* 本月概览 */}
          <MonthlyOverview
            income={overview?.totalIncome || 0}
            expense={overview?.totalExpense || 0}
            balance={overview?.balance || 0}
            month={currentMonth}
          />

          {/* 预算执行情况 */}
          <BudgetProgress
            categories={budgets?.categories.map(cat => ({
              id: cat.category.id,
              name: cat.category.name,
              icon: cat.category.icon,
              budget: cat.budget,
              spent: cat.spent,
              percentage: cat.percentage,
              period: cat.period, // 添加预算周期信息
              categoryId: cat.category.id // 添加分类ID
            })) || []}
            totalBudget={budgets ? {
              amount: budgets.totalBudget,
              spent: budgets.totalSpent,
              percentage: budgets.percentage
            } : undefined}
          />

          {/* 最近交易 */}
          <RecentTransactions
            groupedTransactions={transactionGroups.map(group => ({
              date: group.date,
              transactions: group.transactions.map(tx => ({
                id: tx.id,
                amount: tx.amount,
                type: tx.type,
                categoryName: tx.category?.name || "未分类",
                categoryIcon: tx.category?.icon,
                description: tx.description,
                date: tx.date
              }))
            }))}
          />
        </>
      )}
    </PageContainer>
  );
}
