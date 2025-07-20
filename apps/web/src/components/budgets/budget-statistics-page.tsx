'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PageContainer } from '@/components/layout/page-container';
import { useBudgetStatisticsStore } from '@/store/budget-statistics-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { BudgetTypeSelector } from './budget-statistics/budget-type-selector';
import { BudgetCarousel } from './budget-statistics/budget-carousel';
import { BudgetOverview } from './budget-statistics/budget-overview';
import BudgetTrendChart from './budget-statistics/budget-trend-chart-recharts';
import { CategoryBudgetList } from './budget-statistics/category-budget-list';
import { RecentTransactions } from './budget-statistics/recent-transactions';

export function BudgetStatisticsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { currentAccountBook } = useAccountBookStore();

  const {
    budgetType,
    selectedBudgetId,
    budgetCards,
    familyMembers,
    overview,
    trendData,
    categoryBudgets,
    recentTransactions,
    rolloverHistory,
    chartViewMode,
    chartTimeRange,
    showRolloverImpact,
    isRolloverHistoryOpen,
    categoryFilter,
    enableCategoryBudget,
    isLoading,
    isLoadingTrends,
    error,
    setBudgetType,
    setSelectedBudgetId,
    setChartViewMode,
    setChartTimeRange,
    toggleRolloverImpact,
    toggleRolloverHistory,
    setCategoryFilter,
    fetchBudgetStatistics,
    fetchBudgetTrends,
    fetchRolloverHistory,
    resetState,
  } = useBudgetStatisticsStore();

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 初始化数据
  useEffect(() => {
    const initData = async () => {
      if (currentAccountBook) {
        await fetchBudgetStatistics(
          currentAccountBook.id,
          undefined, // 移除budgetType参数
          undefined, // 移除userId参数
        );
      }
    };

    initData();

    // 组件卸载时重置状态
    return () => resetState();
  }, [currentAccountBook, budgetType, fetchBudgetStatistics, resetState]);

  // 当选中预算变化时，获取结转历史数据
  useEffect(() => {
    if (selectedBudgetId) {
      fetchRolloverHistory(selectedBudgetId);
    }
  }, [selectedBudgetId, fetchRolloverHistory]);

  // 处理预算类型切换
  const handleBudgetTypeChange = (type: 'personal' | 'general') => {
    setBudgetType(type);
    if (currentAccountBook) {
      fetchBudgetStatistics(
        currentAccountBook.id,
        undefined, // 移除budgetType参数
        undefined, // 移除userId参数
      );
    }
  };

  // 处理预算选择
  const handleBudgetSelect = (budgetId: string) => {
    setSelectedBudgetId(budgetId);

    // 查找选中的预算卡片
    const selectedCard = budgetCards.find((card) => card.id === budgetId);

    // 查找选中的家庭成员
    const selectedMember = familyMembers.find((member) => member.budgetId === budgetId);

    // 如果找到了预算卡片或家庭成员，更新overview和其他相关数据
    if (selectedCard || selectedMember) {
      // 获取预算趋势数据和预算详情
      // 如果是家庭成员的预算，传递家庭成员ID
      if (selectedMember) {
        console.log(`选择了家庭成员 ${selectedMember.name} 的预算，ID: ${selectedMember.id}`);
        fetchBudgetTrends(budgetId, chartViewMode, chartTimeRange, selectedMember.id);
      } else {
        fetchBudgetTrends(budgetId, chartViewMode, chartTimeRange);
      }
    }
  };

  // 处理图表视图模式切换
  const handleViewModeChange = (mode: 'daily' | 'weekly' | 'monthly') => {
    setChartViewMode(mode);

    // 如果已有预算ID，获取对应视图模式的趋势数据
    if (selectedBudgetId) {
      // 查找选中的家庭成员
      const selectedMember = familyMembers.find((member) => member.budgetId === selectedBudgetId);

      // 如果是家庭成员的预算，传递家庭成员ID
      if (selectedMember) {
        console.log(`切换图表模式，家庭成员 ${selectedMember.name}，ID: ${selectedMember.id}`);
        fetchBudgetTrends(selectedBudgetId, mode, chartTimeRange, selectedMember.id);
      } else {
        fetchBudgetTrends(selectedBudgetId, mode, chartTimeRange);
      }
    }
  };

  // 处理图表时间范围切换
  const handleTimeRangeChange = (range: '6months' | '12months') => {
    setChartTimeRange(range);

    // 如果已有预算ID，获取对应时间范围的趋势数据
    if (selectedBudgetId) {
      // 查找选中的家庭成员
      const selectedMember = familyMembers.find((member) => member.budgetId === selectedBudgetId);

      // 如果是家庭成员的预算，传递家庭成员ID
      if (selectedMember) {
        console.log(`切换时间范围，家庭成员 ${selectedMember.name}，ID: ${selectedMember.id}`);
        fetchBudgetTrends(selectedBudgetId, chartViewMode, range, selectedMember.id);
      } else {
        fetchBudgetTrends(selectedBudgetId, chartViewMode, range);
      }
    }
  };

  // 处理添加预算按钮点击
  const handleAddBudget = () => {
    router.push('/budgets/add');
  };

  // 右侧操作按钮
  const rightActions = (
    <button onClick={handleAddBudget} className="icon-button" aria-label="添加预算">
      <i className="fas fa-plus"></i>
    </button>
  );

  return (
    <PageContainer title="预算统计" rightActions={rightActions} activeNavItem="budget">
      <div className="budget-statistics-page">
        {/* 预算类型选择器 */}
        <div className="budget-statistics-container">
          <BudgetTypeSelector activeType={budgetType} onChange={handleBudgetTypeChange} />
        </div>

        <div className="budget-statistics-container">
          {isLoading ? (
            <div className="loading-skeleton">
              <div className="loading-state">
                <i className="fas fa-spinner fa-spin"></i>
                <p>加载中...</p>
              </div>
            </div>
          ) : error ? (
            <div className="error-message">
              <p>{error}</p>
              <button
                onClick={() => {
                  if (currentAccountBook) {
                    fetchBudgetStatistics(
                      currentAccountBook.id,
                      undefined, // 移除budgetType参数
                      undefined, // 移除userId参数
                    );
                  }
                }}
                className="retry-button"
              >
                重试
              </button>
            </div>
          ) : (
            <>
              {/* 预算卡片轮播 */}
              <BudgetCarousel
                budgetCards={budgetCards}
                familyMembers={familyMembers}
                selectedBudgetId={selectedBudgetId}
                onBudgetSelect={handleBudgetSelect}
                accountBookType={currentAccountBook?.type || 'PERSONAL'}
              />

              {/* 预算概览 */}
              {overview ? (
                <>
                  <BudgetOverview overview={overview} />

                  {/* 预算趋势图表 */}
                  <BudgetTrendChart
                    data={trendData[chartViewMode] || []}
                    showRolloverImpact={showRolloverImpact}
                    viewMode={chartViewMode}
                    timeRange={chartTimeRange}
                    onViewModeChange={handleViewModeChange}
                    onTimeRangeChange={handleTimeRangeChange}
                    onRolloverImpactToggle={toggleRolloverImpact}
                    isLoading={isLoadingTrends}
                  />

                  {/* 分类预算列表 */}
                  <CategoryBudgetList
                    categoryBudgets={categoryBudgets}
                    filter={categoryFilter}
                    onFilterChange={setCategoryFilter}
                    enableCategoryBudget={enableCategoryBudget}
                  />

                  {/* 最近记账 */}
                  <RecentTransactions
                    transactions={recentTransactions}
                    budgetId={selectedBudgetId}
                    onTransactionDeleted={() => {
                      // 删除成功后重新获取数据
                      fetchBudgetData();
                    }}
                  />
                </>
              ) : (
                <div className="no-budget-data">
                  <div className="no-data-message">
                    <i className="fas fa-chart-pie"></i>
                    <h3>暂无预算数据</h3>
                    <p>请先创建预算或选择其他账本</p>
                    <button className="create-budget-button" onClick={handleAddBudget}>
                      创建预算
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
