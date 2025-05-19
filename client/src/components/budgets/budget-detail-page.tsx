'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { useBudgetDetailStore } from '@/store/budget-detail-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { budgetService } from '@/lib/api/budget-service';
import { BudgetSelector } from './budget-detail/budget-selector';
import { FamilyMemberSelector } from './budget-detail/family-member-selector';
import { FamilyBudgetSummary } from './budget-detail/family-budget-summary';
import { BudgetHeader } from './budget-detail/budget-header';
import { CategoryBudgetStatus } from './budget-detail/category-budget-status';
import { BudgetTrendChart } from './budget-detail/budget-trend-chart';
import { RelatedTransactions } from './budget-detail/related-transactions';
import { BottomActions } from './budget-detail/bottom-actions';
import { RolloverHistoryDialog } from './budget-detail/rollover-history-dialog';
import { DeleteConfirmDialog } from './budget-detail/delete-confirm-dialog';
import { OptionsMenu } from './budget-detail/options-menu';
import { Skeleton } from '@/components/ui/skeleton';

export function BudgetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [budgetId, setBudgetId] = useState<string>(params?.id as string);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  // 获取全局账本状态
  const { currentAccountBook } = useAccountBookStore();

  const {
    budget,
    accountBook,
    categoryBudgets,
    rolloverHistory,
    trendData,
    transactions,
    isLoading,
    isRolloverHistoryOpen,
    chartViewMode,
    showRolloverImpact,
    isDeleteDialogOpen,
    isDeleting,
    error,
    fetchBudgetDetail,
    fetchRolloverHistory,
    fetchTrendData,
    fetchTransactions,
    setChartViewMode,
    toggleRolloverImpact,
    toggleRolloverHistory,
    toggleDeleteDialog,
    deleteBudget,
    resetState
  } = useBudgetDetailStore();

  // 初始化数据
  useEffect(() => {
    const initBudget = async () => {
      try {
        // 重置状态
        resetState();

        let targetBudgetId = budgetId;

        // 如果没有指定预算ID，获取活跃预算列表并使用第一个
        if (!targetBudgetId) {
          try {
            const activeBudgets = await budgetService.getActiveBudgets();
            console.log('初始化预算详情 - 获取到的活跃预算:', activeBudgets);
            console.log('初始化预算详情 - 当前全局账本:', currentAccountBook);

            if (activeBudgets && Array.isArray(activeBudgets) && activeBudgets.length > 0) {
              let filteredBudgets = activeBudgets;

              // 如果有全局账本，过滤出与全局账本匹配的预算
              if (currentAccountBook) {
                console.log(`初始化预算详情 - 根据全局账本 ${currentAccountBook.name} (${currentAccountBook.id}) 过滤预算`);

                const matchingBudgets = activeBudgets.filter(budget =>
                  budget.accountBookId === currentAccountBook.id
                );

                if (matchingBudgets.length > 0) {
                  console.log('初始化预算详情 - 找到匹配全局账本的预算:', matchingBudgets);
                  filteredBudgets = matchingBudgets;
                } else {
                  console.log('初始化预算详情 - 没有找到匹配全局账本的预算，使用所有活跃预算');
                }
              }

              targetBudgetId = filteredBudgets[0].id;
              console.log(`初始化预算详情 - 选择预算ID: ${targetBudgetId}`);

              // 更新URL，但不刷新页面
              window.history.replaceState(null, '', `/budgets/${targetBudgetId}`);
              // 更新状态中的预算ID
              setBudgetId(targetBudgetId);
            } else {
              console.warn('没有找到活跃的预算');
              return;
            }
          } catch (error) {
            console.error('获取活跃预算失败:', error);
            return;
          }
        }

        if (targetBudgetId) {
          // 获取预算详情
          await fetchBudgetDetail(targetBudgetId);

          // 获取趋势数据
          await fetchTrendData(targetBudgetId, chartViewMode);

          // 获取相关交易
          await fetchTransactions(targetBudgetId);
        }
      } catch (error) {
        console.error('初始化预算详情失败:', error);
      }
    };

    initBudget();

    // 组件卸载时重置状态
    return () => resetState();
  }, [budgetId, chartViewMode, fetchBudgetDetail, fetchTrendData, fetchTransactions, resetState, currentAccountBook]);

  // 处理预算切换
  const handleBudgetChange = (newBudgetId: string) => {
    if (newBudgetId !== budgetId) {
      setBudgetId(newBudgetId);
      // 重置当前选择的家庭成员
      setCurrentMemberId(null);

      // 更新URL，但不刷新页面
      window.history.replaceState(null, '', `/budgets/${newBudgetId}`);

      // 获取新预算的详情
      fetchBudgetDetail(newBudgetId);

      // 获取新预算的趋势数据
      fetchTrendData(newBudgetId, chartViewMode);

      // 获取新预算的相关交易
      fetchTransactions(newBudgetId);
    }
  };

  // 处理家庭成员切换
  const handleMemberChange = (memberId: string | null) => {
    setCurrentMemberId(memberId);

    // 获取选定成员的相关交易
    if (budgetId) {
      fetchTransactions(budgetId, 1, memberId);
    }
  };

  // 处理编辑预算
  const handleEdit = () => {
    // 使用正确的路由路径
    router.push(`/budgets/${budgetId}/edit`);
  };

  // 处理删除预算
  const handleDelete = async () => {
    const success = await deleteBudget(budgetId);
    if (success) {
      router.push('/budgets');
    }
  };

  // 处理图表视图模式变更
  const handleViewModeChange = (mode: 'daily' | 'weekly' | 'monthly') => {
    setChartViewMode(mode);
    if (budgetId) {
      fetchTrendData(budgetId, mode);
    }
  };

  // 右侧操作按钮
  const rightActions = (
    <OptionsMenu
      onEdit={handleEdit}
      onDelete={toggleDeleteDialog}
    />
  );

  // 如果正在加载，显示骨架屏
  if (isLoading) {
    return (
      <PageContainer
        title="预算详情"
        showBackButton={true}
        activeNavItem="budget"
      >
        <Skeleton className="h-16 w-full mb-4" />
        <Skeleton className="h-64 w-full mb-4" />
        <Skeleton className="h-40 w-full mb-4" />
        <Skeleton className="h-64 w-full mb-4" />
        <Skeleton className="h-40 w-full mb-20" />
      </PageContainer>
    );
  }

  // 如果发生错误，显示错误信息
  if (error) {
    return (
      <PageContainer
        title="预算详情"
        showBackButton={true}
        activeNavItem="budget"
      >
        <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <i className="fas fa-exclamation-triangle text-red-500 text-xl"></i>
          </div>
          <h2 className="text-xl font-semibold mb-2">无法加载预算信息</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
            onClick={() => router.push('/budgets')}
          >
            返回预算列表
          </button>
        </div>
      </PageContainer>
    );
  }

  // 如果没有预算数据，显示空状态
  if (!budget) {
    return (
      <PageContainer
        title="预算详情"
        showBackButton={true}
        activeNavItem="budget"
      >
        <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <i className="fas fa-search text-gray-400 text-xl"></i>
          </div>
          <h2 className="text-xl font-semibold mb-2">未找到预算</h2>
          <p className="text-gray-500 mb-6">该预算可能已被删除或您没有权限访问</p>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
            onClick={() => router.push('/budgets')}
          >
            返回预算列表
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="预算详情"
      rightActions={rightActions}
      showBackButton={false}
      activeNavItem="budget"
    >
      {/* 预算选择器 */}
      <BudgetSelector
        currentBudgetId={budgetId}
        onBudgetChange={handleBudgetChange}
      />

      {/* 家庭成员选择器 - 仅在家庭预算时显示 */}
      {budget && budget.familyId && (
        <FamilyMemberSelector
          familyId={budget.familyId}
          currentMemberId={currentMemberId}
          onMemberChange={handleMemberChange}
        />
      )}

      {/* 预算基本信息 */}
      <BudgetHeader
        budget={budget}
        onRolloverHistoryClick={toggleRolloverHistory}
      />

      {/* 分类预算状态 */}
      {budget.enableCategoryBudget && (
        <CategoryBudgetStatus
          categoryBudgets={categoryBudgets}
          enabled={budget.enableCategoryBudget}
          onToggle={() => {}} // 详情页面不允许修改，仅显示
        />
      )}

      {/* 家庭预算汇总 - 仅在家庭预算时显示 */}
      {budget && budget.familyId && budget.amount > 0 && (
        <FamilyBudgetSummary
          budgetId={budgetId}
          familyId={budget.familyId}
          totalAmount={budget.amount}
        />
      )}

      {/* 预算趋势图表 */}
      <BudgetTrendChart
        data={trendData[chartViewMode] || []}
        showRolloverImpact={showRolloverImpact}
        viewMode={chartViewMode}
        onViewModeChange={handleViewModeChange}
        onRolloverImpactToggle={toggleRolloverImpact}
      />

      {/* 相关交易 */}
      <RelatedTransactions
        transactions={transactions}
        budgetId={budgetId}
      />

      {/* 底部操作按钮 */}
      <BottomActions
        onEdit={handleEdit}
        onDelete={toggleDeleteDialog}
      />

      {/* 结转历史对话框 */}
      {isRolloverHistoryOpen && (
        <RolloverHistoryDialog
          isOpen={isRolloverHistoryOpen}
          onClose={toggleRolloverHistory}
          history={rolloverHistory}
        />
      )}

      {/* 删除确认对话框 */}
      {isDeleteDialogOpen && (
        <DeleteConfirmDialog
          isOpen={isDeleteDialogOpen}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={toggleDeleteDialog}
        />
      )}
    </PageContainer>
  );
}
