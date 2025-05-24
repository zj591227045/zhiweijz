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

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { currentAccountBook, fetchAccountBooks } = useAccountBookStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 状态
  const [monthlyStats, setMonthlyStats] = useState({
    income: 0,
    expense: 0,
    balance: 0,
    month: formatDate(new Date(), "YYYY年MM月"),
  });
  const [budgetCategories, setBudgetCategories] = useState<any[]>([]);
  const [totalBudget, setTotalBudget] = useState<any>(null);
  const [groupedTransactions, setGroupedTransactions] = useState<any[]>([]);

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
  }, [isAuthenticated, router, fetchAccountBooks, currentAccountBook]);

  // 获取仪表盘数据
  const fetchDashboardData = async (accountBookId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // 并行请求数据
      await Promise.all([
        fetchMonthlyStatistics(accountBookId),
        fetchBudgetStatistics(accountBookId),
        fetchRecentTransactions(accountBookId)
      ]);

      setIsLoading(false);
    } catch (error) {
      console.error("获取仪表盘数据失败:", error);
      setError("获取仪表盘数据失败");
      setIsLoading(false);
    }
  };

  // 获取月度统计
  const fetchMonthlyStatistics = async (accountBookId: string) => {
    try {
      console.log("开始获取月度统计数据...");
      const currentMonth = dayjs().format("YYYY-MM");
      const startDate = dayjs().startOf("month").format("YYYY-MM-DD");
      const endDate = dayjs().endOf("month").format("YYYY-MM-DD");

      // 使用统计API获取月度数据
      const response = await statisticsService.getStatistics(accountBookId, {
        startDate,
        endDate
      });

      console.log("月度统计数据响应:", response);

      if (response) {
        setMonthlyStats({
          income: response.income || 0,
          expense: response.expense || 0,
          balance: response.netIncome || 0,
          month: formatDate(new Date(), "YYYY年MM月"),
        });
      }

      return response;
    } catch (error) {
      console.error("获取月度统计失败:", error);
      throw error;
    }
  };

  // 获取预算统计
  const fetchBudgetStatistics = async (accountBookId: string) => {
    try {
      console.log("开始获取预算统计数据...");
      const currentMonth = dayjs().format("YYYY-MM");

      // 使用预算API获取预算统计
      const response = await budgetService.getBudgetStatistics(accountBookId, {
        month: currentMonth
      });

      console.log("预算统计数据响应:", response);

      if (response) {
        // 处理预算分类数据
        const categories = response.categories.map((cat: any) => ({
          id: cat.category.id,
          name: cat.category.name,
          icon: cat.category.icon,
          budget: cat.budget,
          spent: cat.spent,
          percentage: cat.percentage,
          period: cat.period || "MONTHLY",
          categoryId: cat.category.id,
        }));

        setBudgetCategories(categories);

        // 设置总预算
        if (response.totalBudget && response.totalSpent) {
          setTotalBudget({
            amount: response.totalBudget,
            spent: response.totalSpent,
            percentage: (response.totalSpent / response.totalBudget) * 100,
          });
        }
      }

      return response;
    } catch (error) {
      console.error("获取预算统计失败:", error);
      throw error;
    }
  };

  // 获取最近交易
  const fetchRecentTransactions = async (accountBookId: string) => {
    try {
      console.log("开始获取最近交易数据...");

      // 先获取最近交易列表
      const transactionsResponse = await transactionService.getRecentTransactions(accountBookId, 10);
      console.log("最近交易数据响应:", transactionsResponse);

      if (transactionsResponse && transactionsResponse.data && Array.isArray(transactionsResponse.data)) {
        // 手动按日期分组交易
        const groupedByDate: Record<string, any[]> = {};

        transactionsResponse.data.forEach((tx: any) => {
          const dateKey = dayjs(tx.date).format("YYYY-MM-DD");
          if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
          }
          groupedByDate[dateKey].push(tx);
        });

        // 转换为组件需要的格式
        const formattedTransactions = Object.keys(groupedByDate)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
          .map(dateKey => {
            return {
              date: formatDate(dateKey, "MM月DD日"),
              transactions: groupedByDate[dateKey].map((tx: any) => ({
                id: tx.id,
                amount: tx.amount,
                type: tx.type,
                categoryName: tx.category?.name || "未分类",
                categoryIcon: tx.category?.icon || "other",
                description: tx.description || "",
                date: tx.date,
              })),
            };
          });

        console.log("格式化后的交易数据:", formattedTransactions);
        setGroupedTransactions(formattedTransactions);
      }

      return transactionsResponse;
    } catch (error) {
      console.error("获取最近交易失败:", error);
      throw error;
    }
  };

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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
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
