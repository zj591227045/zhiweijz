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
import { BudgetFilter } from '../transactions/budget-filter';
import { getCurrentMonthRange } from '@/lib/utils';
import TransactionEditModal from '@/components/transaction-edit-modal';
import '../transactions/budget-filter.css';

// 添加CSS动画样式
const animationStyles = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

// 将样式注入到页面中
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = animationStyles;
  if (!document.head.querySelector('style[data-filter-animations]')) {
    styleElement.setAttribute('data-filter-animations', 'true');
    document.head.appendChild(styleElement);
  }
}

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
    reset,
  } = useStatisticsStore();

  // 预算筛选状态
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  // 筛选器显示状态
  const [showFilters, setShowFilters] = useState(false);

  // 记账编辑模态框状态
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingTransactionData, setEditingTransactionData] = useState<any>(null);

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
      fetchStatisticsData(
        startDate,
        endDate,
        currentAccountBook.id,
        selectedTagIds,
        'month',
        selectedBudgetId,
      );
    }

    // 组件卸载时重置状态
    return () => reset();
  }, [currentAccountBook?.id, fetchStatisticsData, setDateRange, setTimeRangeType, reset]);

  // 处理日期范围变化
  const handleDateRangeChange = (
    newDateRange: { startDate: string; endDate: string },
    rangeType: TimeRangeType,
  ) => {
    setDateRange(newDateRange);
    setTimeRangeType(rangeType);

    if (currentAccountBook?.id) {
      fetchStatisticsData(
        newDateRange.startDate,
        newDateRange.endDate,
        currentAccountBook.id,
        selectedTagIds,
        rangeType,
        selectedBudgetId,
      );
    }
  };

  // 处理预算筛选变化
  const handleBudgetChange = (budgetId: string | null, budgetIds?: string[]) => {
    setSelectedBudgetId(budgetId);

    if (currentAccountBook?.id && dateRange.startDate && dateRange.endDate) {
      fetchStatisticsData(
        dateRange.startDate,
        dateRange.endDate,
        currentAccountBook.id,
        selectedTagIds,
        timeRangeType,
        budgetId,
        budgetIds,
      );
    }
  };

  // 重置所有筛选器
  const resetAllFilters = () => {
    setSelectedBudgetId(null);
    setSelectedTagIds([]);

    if (currentAccountBook?.id && dateRange.startDate && dateRange.endDate) {
      fetchStatisticsData(
        dateRange.startDate,
        dateRange.endDate,
        currentAccountBook.id,
        [],
        timeRangeType,
        null,
      );
    }
  };

  // 处理记账编辑
  const handleTransactionEdit = (transactionId: string, transactionData?: any) => {
    setEditingTransactionId(transactionId);
    setEditingTransactionData(transactionData);
  };

  // 关闭编辑模态框
  const handleCloseEditModal = () => {
    setEditingTransactionId(null);
    setEditingTransactionData(null);
  };

  // 记账保存后的处理
  const handleTransactionSaved = () => {
    // 刷新统计数据
    if (currentAccountBook?.id && dateRange.startDate && dateRange.endDate) {
      fetchStatisticsData(
        dateRange.startDate,
        dateRange.endDate,
        currentAccountBook.id,
        selectedTagIds,
        timeRangeType,
        selectedBudgetId,
      );
    }
    handleCloseEditModal();
  };

  // 检查是否有活跃的筛选条件
  const hasActiveFilters = selectedBudgetId || selectedTagIds.length > 0;

  // 检查当前时间范围是否跨越多个月
  const isMultiMonthRange = () => {
    if (!dateRange.startDate || !dateRange.endDate) return false;

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);

    // 检查是否跨越不同的年月
    const startYearMonth = `${startDate.getFullYear()}-${startDate.getMonth()}`;
    const endYearMonth = `${endDate.getFullYear()}-${endDate.getMonth()}`;

    return startYearMonth !== endYearMonth;
  };

  // 右侧操作按钮
  const rightActions = (
    <>
      <button
        className={`icon-button ${showFilters ? 'active' : ''}`}
        onClick={() => setShowFilters(!showFilters)}
        title="筛选器"
        style={{
          backgroundColor: showFilters || hasActiveFilters ? 'var(--primary-color)' : 'transparent',
          color: showFilters || hasActiveFilters ? 'white' : 'var(--text-primary)',
          position: 'relative',
        }}
      >
        <i className="fas fa-filter"></i>
        {hasActiveFilters && !showFilters && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '8px',
              height: '8px',
              backgroundColor: '#ef4444',
              borderRadius: '50%',
              border: '1px solid white',
            }}
          ></span>
        )}
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

        {/* 筛选器容器 */}
        {showFilters && currentAccountBook?.id && (
          <div
            className="filters-container"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              marginBottom: '20px',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              animation: 'slideDown 0.3s ease-out',
              border: '1px solid #f1f5f9',
            }}
          >
            <div
              className="filters-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, var(--primary-color) 0%, #667eea 100%)',
                color: 'white',
              }}
            >
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white',
                  margin: '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flex: '1',
                }}
              >
                <i className="fas fa-filter"></i>
                筛选条件
                {hasActiveFilters && (
                  <span
                    style={{
                      marginLeft: '4px',
                      color: '#fbbf24',
                      animation: 'pulse 2s infinite',
                    }}
                  >
                    <i className="fas fa-circle" style={{ fontSize: '8px' }}></i>
                  </span>
                )}
              </h3>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexShrink: '0',
                }}
              >
                {hasActiveFilters && (
                  <button
                    className="reset-filters-btn"
                    onClick={resetAllFilters}
                    title="重置筛选器"
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: 'white',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <i className="fas fa-undo"></i>
                  </button>
                )}
                <button
                  className="close-filters-btn"
                  onClick={() => setShowFilters(false)}
                  title="关闭筛选器"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* 预算筛选器 */}
            <div
              className="filter-item"
              style={{
                padding: '20px',
                borderBottom: '1px solid #f1f5f9',
                backgroundColor: '#ffffff',
              }}
            >
              <div
                className="filter-item-header"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#374151',
                }}
              >
                <i
                  className="fas fa-wallet"
                  style={{
                    fontSize: '14px',
                    color: '#3b82f6',
                    width: '18px',
                    textAlign: 'center',
                  }}
                ></i>
                <span>预算筛选</span>
              </div>
              <BudgetFilter
                selectedBudgetId={selectedBudgetId}
                onBudgetChange={handleBudgetChange}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                className="mobile-budget-filter"
                enableAggregation={true}
              />
              {/* 聚合提示信息 - 只在跨月时显示 */}
              {isMultiMonthRange() && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#0369a1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <i className="fas fa-info-circle" style={{ fontSize: '10px' }}></i>
                  <span>跨月份时间范围时，相同用户的个人预算将自动聚合显示</span>
                </div>
              )}
            </div>

            {/* 标签筛选器 */}
            <div
              className="filter-item"
              style={{
                padding: '20px',
                backgroundColor: '#ffffff',
              }}
            >
              <div
                className="filter-item-header"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#374151',
                }}
              >
                <i
                  className="fas fa-tags"
                  style={{
                    fontSize: '14px',
                    color: '#10b981',
                    width: '18px',
                    textAlign: 'center',
                  }}
                ></i>
                <span>标签筛选</span>
              </div>
              <TagFilterSelector
                accountBookId={currentAccountBook.id}
                selectedTagIds={selectedTagIds}
                onSelectionChange={(tagIds) => {
                  setSelectedTagIds(tagIds);
                  // 标签变化时重新获取数据
                  if (dateRange.startDate && dateRange.endDate) {
                    fetchStatisticsData(
                      dateRange.startDate,
                      dateRange.endDate,
                      currentAccountBook.id,
                      tagIds,
                      timeRangeType,
                      selectedBudgetId,
                    );
                  }
                }}
              />
            </div>
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
                  fetchStatisticsData(
                    dateRange.startDate,
                    dateRange.endDate,
                    currentAccountBook.id,
                    selectedTagIds,
                    timeRangeType,
                  );
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
              onTransactionEdit={handleTransactionEdit}
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

      {/* 记账编辑模态框 */}
      {editingTransactionId && (
        <TransactionEditModal
          transactionId={editingTransactionId}
          transactionData={editingTransactionData}
          onClose={handleCloseEditModal}
          onSave={handleTransactionSaved}
        />
      )}
    </PageContainer>
  );
}
