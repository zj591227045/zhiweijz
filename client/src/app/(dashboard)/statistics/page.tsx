"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useAccountBookStore } from "@/store/account-book-store";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { DateRangePicker } from "@/components/statistics/date-range-picker";
import { StatsSummaryCard } from "@/components/statistics/stats-summary-card";
import { CategoryDistribution } from "@/components/statistics/category-distribution";
import { TrendChart } from "@/components/statistics/trend-chart";
import { AnalysisNavigation } from "@/components/statistics/analysis-navigation";
import { getCurrentMonthRange } from "@/lib/api-services";
import { useStatisticsStore } from "@/store/statistics-store";
import { toast } from "sonner";

export default function StatisticsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { currentAccountBook } = useAccountBookStore();
  const { 
    isLoading, 
    setIsLoading,
    fetchStatisticsData,
    statisticsData,
    dateRange,
    setDateRange
  } = useStatisticsStore();

  // 初始化日期范围
  useEffect(() => {
    if (!dateRange.startDate || !dateRange.endDate) {
      const { startDate, endDate } = getCurrentMonthRange();
      setDateRange({ startDate, endDate });
    }
  }, [dateRange, setDateRange]);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // 获取统计数据
  useEffect(() => {
    const loadData = async () => {
      if (!dateRange.startDate || !dateRange.endDate) return;
      
      setIsLoading(true);
      try {
        await fetchStatisticsData(
          dateRange.startDate,
          dateRange.endDate,
          currentAccountBook?.id
        );
      } catch (error) {
        console.error("获取统计数据失败:", error);
        toast.error("获取统计数据失败，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && dateRange.startDate && dateRange.endDate) {
      loadData();
    }
  }, [
    isAuthenticated, 
    dateRange, 
    currentAccountBook, 
    fetchStatisticsData, 
    setIsLoading
  ]);

  // 格式化当前日期显示
  const formatCurrentDate = () => {
    if (!dateRange.startDate) return "";
    
    const startDate = new Date(dateRange.startDate);
    const year = startDate.getFullYear();
    const month = startDate.getMonth() + 1;
    return `${year}年${month}月`;
  };

  return (
    <div className="app-container">
      <div className="header">
        <div className="header-title">统计分析</div>
        <div className="header-actions">
          <button className="icon-button">
            <i className="fas fa-calendar-alt"></i>
          </button>
        </div>
      </div>

      <div className="main-content">
        {/* 日期选择器 */}
        <DateRangePicker 
          currentDate={formatCurrentDate()}
          onPrevMonth={() => {/* 处理上个月 */}}
          onNextMonth={() => {/* 处理下个月 */}}
        />

        {/* 统计概览卡片 */}
        <StatsSummaryCard 
          income={statisticsData?.totalIncome || 0}
          expense={statisticsData?.totalExpense || 0}
          balance={statisticsData?.balance || 0}
          isLoading={isLoading}
        />

        {/* 分类占比图表 */}
        <CategoryDistribution 
          expenseCategories={statisticsData?.expenseByCategory || []}
          incomeCategories={statisticsData?.incomeByCategory || []}
          isLoading={isLoading}
        />

        {/* 趋势图表 */}
        <TrendChart 
          dailyStatistics={statisticsData?.dailyStatistics || []}
          isLoading={isLoading}
        />

        {/* 详细分析导航 */}
        <AnalysisNavigation />
      </div>

      {/* 底部导航栏 */}
      <BottomNavigation />
    </div>
  );
}
