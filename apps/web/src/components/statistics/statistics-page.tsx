'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PageContainer } from '@/components/layout/page-container';
import { useAccountBookStore } from '@/store/account-book-store';
import { useStatisticsStore, TimeRangeType } from '@/store/statistics-store';
import { EnhancedDateRangePicker } from './enhanced-date-range-picker';
import { StatsSummaryCard } from './stats-summary-card';
import { CategoryDistribution } from './category-distribution';
import { TrendChart } from './trend-chart';
import { AnalysisNavigation } from './analysis-navigation';
import { TagFilterSelector } from './tag-filter-selector';
import { getCurrentMonthRange } from '@/lib/utils';

export function StatisticsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { currentAccountBook } = useAccountBookStore();
  const {
    statisticsData,
    dateRange,
    timeRangeType,
    selectedTagIds,
    isLoading,
    error,
    fetchStatisticsData,
    setDateRange,
    setTimeRangeType,
    setSelectedTagIds,
    reset
  } = useStatisticsStore();

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 初始化加载统计数据
  useEffect(() => {
    if (currentAccountBook?.id) {
      // 设置初始日期范围为当前月份
      const { startDate, endDate } = getCurrentMonthRange();
      setDateRange({ startDate, endDate });
      setTimeRangeType('month');
      fetchStatisticsData(startDate, endDate, currentAccountBook.id, selectedTagIds, 'month');
    }

    // 组件卸载时重置状态
    return () => reset();
  }, [currentAccountBook?.id, fetchStatisticsData, setDateRange, setTimeRangeType, reset]);

  // 处理日期范围变化
  const handleDateRangeChange = (newDateRange: { startDate: string; endDate: string }, rangeType: TimeRangeType) => {
    setDateRange(newDateRange);
    setTimeRangeType(rangeType);

    if (currentAccountBook?.id) {
      fetchStatisticsData(
        newDateRange.startDate,
        newDateRange.endDate,
        currentAccountBook.id,
        selectedTagIds,
        rangeType
      );
    }
  };

  // 右侧操作按钮
  const rightActions = (
    <>
      <button className="icon-button">
        <i className="fas fa-calendar-alt"></i>
      </button>
    </>
  );

  return (
    <PageContainer title="统计分析" rightActions={rightActions} activeNavItem="statistics">
      <div className="statistics-analysis-page">
        {/* 增强的日期范围选择器 */}
        <EnhancedDateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onDateRangeChange={handleDateRangeChange}
        />

        {/* 标签筛选器 */}
        {currentAccountBook?.id && (
          <div className="mb-4">
            <TagFilterSelector
              accountBookId={currentAccountBook.id}
              selectedTagIds={selectedTagIds}
              onSelectionChange={(tagIds) => {
                setSelectedTagIds(tagIds);
                // 标签变化时重新获取数据
                if (dateRange.startDate && dateRange.endDate) {
                  fetchStatisticsData(dateRange.startDate, dateRange.endDate, currentAccountBook.id, tagIds, timeRangeType);
                }
              }}
            />
          </div>
        )}

      {isLoading ? (
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>加载中...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <i className="fas fa-exclamation-circle"></i>
          <p>{error.message}</p>
          <button
            className="retry-button"
            onClick={() => {
              if (dateRange.startDate && dateRange.endDate && currentAccountBook?.id) {
                fetchStatisticsData(dateRange.startDate, dateRange.endDate, currentAccountBook.id, selectedTagIds, timeRangeType);
              }
            }}
          >
            重试
          </button>
        </div>
      ) : statisticsData ? (
        <>
          {/* 财务概览 */}
          <StatsSummaryCard
            totalIncome={statisticsData.totalIncome}
            totalExpense={statisticsData.totalExpense}
            balance={statisticsData.balance}
          />

          {/* 分类分布 */}
          <CategoryDistribution
            expenseCategories={statisticsData.expenseByCategory}
            incomeCategories={statisticsData.incomeByCategory}
          />

          {/* 收支趋势 */}
          <TrendChart dailyStatistics={statisticsData.dailyStatistics} />

          {/* 统计导航 */}
          <AnalysisNavigation />
        </>
      ) : (
        <div className="empty-state">
          <i className="fas fa-chart-bar"></i>
          <p>暂无统计数据</p>
        </div>
      )}
      </div>
    </PageContainer>
  );
}
