"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuthStore } from "@/store/auth-store";
import { useAccountBookStore } from "@/store/account-book-store";
import { apiClient } from "@/lib/api";
import { StatisticsResponse, Transaction } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";

// 注册Chart.js组件
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { currentAccountBook } = useAccountBookStore();
  const [isLoading, setIsLoading] = useState(true);
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // 获取统计数据和最近交易
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentAccountBook) return;

      try {
        setIsLoading(true);
        
        // 获取当前月份的统计数据
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const [statisticsData, transactionsData] = await Promise.all([
          apiClient.get<StatisticsResponse>(`/statistics?accountBookId=${currentAccountBook.id}&startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`),
          apiClient.get<Transaction[]>(`/transactions?accountBookId=${currentAccountBook.id}&limit=5&sort=date:desc`)
        ]);
        
        setStatistics(statisticsData);
        setRecentTransactions(transactionsData);
      } catch (error: any) {
        toast.error("获取仪表盘数据失败");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentAccountBook]);

  // 准备饼图数据
  const expenseChartData = {
    labels: statistics?.expenseByCategory.map(item => item.categoryName) || [],
    datasets: [
      {
        data: statistics?.expenseByCategory.map(item => item.amount) || [],
        backgroundColor: [
          "#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
          "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
        ],
        borderWidth: 1,
      },
    ],
  };

  // 准备折线图数据
  const dailyChartData = {
    labels: statistics?.dailyStatistics.map(item => formatDate(item.date, "MM-DD")) || [],
    datasets: [
      {
        label: "支出",
        data: statistics?.dailyStatistics.map(item => item.expense) || [],
        borderColor: "#EF4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.3,
      },
      {
        label: "收入",
        data: statistics?.dailyStatistics.map(item => item.income) || [],
        borderColor: "#10B981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.3,
      },
    ],
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* 标题 */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">仪表盘</h1>
          <p className="text-muted-foreground">
            查看您的财务概览和最近交易
          </p>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground">加载中...</p>
          </div>
        ) : (
          <>
            {/* 财务概览卡片 */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="text-sm font-medium text-muted-foreground">本月收入</div>
                <div className="mt-2 text-3xl font-bold text-green-500">
                  {formatCurrency(statistics?.totalIncome || 0)}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="text-sm font-medium text-muted-foreground">本月支出</div>
                <div className="mt-2 text-3xl font-bold text-red-500">
                  {formatCurrency(statistics?.totalExpense || 0)}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="text-sm font-medium text-muted-foreground">本月结余</div>
                <div className="mt-2 text-3xl font-bold">
                  {formatCurrency(statistics?.balance || 0)}
                </div>
              </div>
            </div>

            {/* 图表区域 */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* 支出分类饼图 */}
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold">支出分类</h3>
                <div className="h-64">
                  {statistics?.expenseByCategory.length ? (
                    <Doughnut 
                      data={expenseChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "right",
                            labels: {
                              boxWidth: 12,
                              padding: 15,
                            },
                          },
                        },
                      }} 
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-muted-foreground">暂无支出数据</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 每日收支折线图 */}
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold">每日收支</h3>
                <div className="h-64">
                  {statistics?.dailyStatistics.length ? (
                    <Line 
                      data={dailyChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "top",
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                          },
                        },
                      }} 
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-muted-foreground">暂无每日数据</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 最近交易 */}
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-semibold">最近交易</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">日期</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">分类</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">描述</th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.length > 0 ? (
                      recentTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b">
                          <td className="px-6 py-4 text-sm">
                            {formatDate(transaction.date)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {transaction.category?.name || "未分类"}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {transaction.description || "-"}
                          </td>
                          <td className={`px-6 py-4 text-right text-sm font-medium ${
                            transaction.type === "EXPENSE" ? "text-red-500" : "text-green-500"
                          }`}>
                            {transaction.type === "EXPENSE" ? "-" : "+"}
                            {formatCurrency(transaction.amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-muted-foreground">
                          暂无交易记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
