'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PageContainer } from '@/components/layout/page-container';
import { useAccountBookStore } from '@/store/account-book-store';
import { useStatisticsStore } from '@/store/statistics-store';
import { DateRangePicker } from './date-range-picker';
import { StatsSummaryCard } from './stats-summary-card';
import { CategoryDistribution } from './category-distribution';
import { TrendChart } from './trend-chart';
import { AnalysisNavigation } from './analysis-navigation';
import { TagFilterSelector } from './tag-filter-selector';
import { getCurrentMonthRange, getPreviousMonthRange, getNextMonthRange } from '@/lib/utils';

export function StatisticsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { currentAccountBook } = useAccountBookStore();
  const {
    statisticsData,
    dateRange,
    selectedTagIds,
    isLoading,
    error,
    fetchStatisticsData,
    setDateRange,
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
      fetchStatisticsData(startDate, endDate, currentAccountBook.id, selectedTagIds);
    }

    // 组件卸载时重置状态
    return () => reset();
  }, [currentAccountBook?.id, fetchStatisticsData, setDateRange, reset]);

  // 处理上一个时间段
  const handlePreviousPeriod = () => {
    if (dateRange.startDate && dateRange.endDate) {
      const { startDate, endDate } = getPreviousMonthRange(new Date(dateRange.startDate));
      setDateRange({ startDate, endDate });

      if (currentAccountBook?.id) {
        fetchStatisticsData(startDate, endDate, currentAccountBook.id, selectedTagIds);
      }
    }
  };

  // 处理下一个时间段
  const handleNextPeriod = () => {
    if (dateRange.startDate && dateRange.endDate) {
      const { startDate, endDate } = getNextMonthRange(new Date(dateRange.startDate));
      setDateRange({ startDate, endDate });

      if (currentAccountBook?.id) {
        fetchStatisticsData(startDate, endDate, currentAccountBook.id, selectedTagIds);
      }
    }
  };

  // 处理当前时间段
  const handleCurrentPeriod = () => {
    const { startDate, endDate } = getCurrentMonthRange();
    setDateRange({ startDate, endDate });

    if (currentAccountBook?.id) {
      fetchStatisticsData(startDate, endDate, currentAccountBook.id, selectedTagIds);
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
        {/* 日期选择器 */}
        <DateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onPrevious={handlePreviousPeriod}
          onNext={handleNextPeriod}
          onToday={handleCurrentPeriod}
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
                  fetchStatisticsData(dateRange.startDate, dateRange.endDate, currentAccountBook.id, tagIds);
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
                fetchStatisticsData(dateRange.startDate, dateRange.endDate, currentAccountBook.id, selectedTagIds);
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
