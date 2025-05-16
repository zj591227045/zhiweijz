"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useAccountBookStore } from "@/store/account-book-store";
import { toast } from "sonner";
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
import { BottomNavigation } from "@/components/layout/bottom-navigation";

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { currentAccountBook, accountBooks, fetchAccountBooks } = useAccountBookStore();

  // 状态
  const [isLoading, setIsLoading] = useState(true);
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
      console.log("尝试获取账本列表...");
      fetchAccountBooks().catch((error: any) => {
        console.error("获取账本列表失败:", error);
        toast.error("获取账本列表失败，请稍后重试");
      });
    }
  }, [isAuthenticated, accountBooks.length, fetchAccountBooks]);

  // 获取仪表盘数据
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        console.log("开始获取仪表盘数据");
        console.log("认证状态:", isAuthenticated);
        console.log("当前账本:", currentAccountBook);
        console.log("账本列表:", accountBooks);

        // 如果没有账本，尝试获取账本列表
        if (accountBooks.length === 0) {
          console.log("没有账本，尝试获取账本列表...");
          await fetchAccountBooks();
          console.log("获取账本列表后:", useAccountBookStore.getState().accountBooks);

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
        console.log("日期范围:", startDate, endDate);

        // 获取当前账本ID
        const accountBookId = currentAccountBook?.id;
        console.log("使用账本ID:", accountBookId);

        // 并行获取所有数据
        console.log("开始并行请求数据...");

        try {
          const overviewData = await getFinancialOverview(startDate, endDate, accountBookId);
          console.log("财务概览数据:", overviewData);
          setOverview(overviewData);
        } catch (error) {
          console.error("获取财务概览数据失败:", error);
        }

        try {
          const budgetData = await getBudgetStatistics(currentMonthStr, accountBookId);
          console.log("预算数据:", budgetData);
          setBudgets(budgetData);
        } catch (error) {
          console.error("获取预算数据失败:", error);
        }

        try {
          const transactionsData = await getRecentTransactions(10, accountBookId);
          console.log("交易数据:", transactionsData);

          // 确保transactionsData是数组
          if (Array.isArray(transactionsData)) {
            // 将交易记录按日期分组
            const grouped = groupTransactionsByDate(transactionsData);
            setTransactionGroups(grouped);
          } else {
            console.error("交易数据不是数组:", transactionsData);
            setTransactionGroups([]);
          }
        } catch (error) {
          console.error("获取交易数据失败:", error);
          setTransactionGroups([]);
        }

      } catch (error) {
        console.error("获取仪表盘数据失败:", error);
        toast.error("获取仪表盘数据失败，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    };

    // 只有在认证状态下才获取数据
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [currentAccountBook, isAuthenticated, accountBooks, fetchAccountBooks]);

  return (
    <div className="app-container">
      {/* 顶部导航栏 */}
      <header className="header shadow-sm">
        <div className="header-title">仪表板</div>
        <div className="header-actions">
          <button className="icon-button"><i className="fas fa-bell"></i></button>
          <button className="icon-button"><i className="fas fa-cog"></i></button>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="main-content">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-gray-500">加载中...</p>
          </div>
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
                percentage: cat.percentage
              })) || []}
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
      </main>

      {/* 底部导航栏 */}
      <BottomNavigation />
    </div>
  );
}
