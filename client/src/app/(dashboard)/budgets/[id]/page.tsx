'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { useBudgetDetailStore } from '@/store/budget-detail-store';
import { RolloverHistoryDialog } from '@/components/budgets/rollover-history-dialog';
import { toast } from 'sonner';
import './budget-detail.css';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function BudgetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const budgetId = params.id as string;

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

  // 加载预算详情数据
  useEffect(() => {
    if (budgetId) {
      fetchBudgetDetail(budgetId);
      fetchTrendData(budgetId, chartViewMode);
      fetchTransactions(budgetId);
    }

    // 组件卸载时重置状态
    return () => resetState();
  }, [budgetId]);

  // 处理编辑预算
  const handleEdit = () => {
    router.push(`/budgets/${budgetId}/edit`);
  };

  // 处理删除预算
  const handleDelete = async () => {
    if (await deleteBudget(budgetId)) {
      router.push('/budgets');
    }
  };

  // 右侧操作按钮
  const rightActions = (
    <button
      onClick={toggleDeleteDialog}
      className="icon-button"
    >
      <i className="fas fa-ellipsis-v"></i>
    </button>
  );

  // 格式化金额
  const formatAmount = (amount: number) => {
    return `¥${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // 格式化日期范围
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 - ${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日`;
  };

  // 确定进度条颜色
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    return '';
  };

  if (isLoading) {
    return (
      <PageContainer
        title="预算详情"
        showBackButton={true}
        activeNavItem="budget"
      >
        <div className="loading-skeleton">
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer
        title="预算详情"
        showBackButton={true}
        activeNavItem="budget"
      >
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          <p>{error}</p>
          <button
            onClick={() => fetchBudgetDetail(budgetId)}
            className="retry-button"
          >
            重试
          </button>
        </div>
      </PageContainer>
    );
  }

  if (!budget) {
    return (
      <PageContainer
        title="预算详情"
        showBackButton={true}
        activeNavItem="budget"
      >
        <div className="not-found-message">
          <i className="fas fa-search"></i>
          <p>未找到预算信息</p>
          <button
            onClick={() => router.push('/budgets')}
            className="back-button"
          >
            返回预算列表
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={budget.name}
      rightActions={rightActions}
      showBackButton={true}
      activeNavItem="budget"
    >
      {/* 账本信息 */}
      <div className="account-book-info">
        <i className={`fas fa-${accountBook?.type === 'FAMILY' ? 'users' : 'book'}`}></i>
        <span>{accountBook?.name || '未知账本'}</span>
      </div>

      {/* 预算基本信息 */}
      <div className="budget-header">
        <div className="budget-period">{formatDateRange(budget.startDate, budget.endDate)}</div>
        <div className="budget-amount">{formatAmount(budget.amount)}</div>

        {/* 结转信息 */}
        {budget.rollover && (
          <div className="rollover-info">
            <div className={`rollover-badge ${budget.rolloverAmount && budget.rolloverAmount >= 0 ? 'positive' : 'negative'}`}>
              <i className="fas fa-exchange-alt"></i>
              <span>
                本月结转: {budget.rolloverAmount && budget.rolloverAmount >= 0 ? '+' : ''}
                {formatAmount(budget.rolloverAmount || 0)}
              </span>
            </div>
            <button className="rollover-history-button" onClick={toggleRolloverHistory}>
              <i className="fas fa-history"></i>
              <span>结转历史</span>
            </button>
          </div>
        )}

        {/* 预算进度 */}
        <div className="budget-progress-container">
          <div className="budget-progress-info">
            <div className="spent-amount">
              已用: {formatAmount(budget.spent)} ({budget.percentage.toFixed(1)}%)
            </div>
            <div className={`remaining-amount ${(budget.adjustedRemaining ?? budget.remaining) >= 0 ? 'positive' : 'negative'}`}>
              剩余: {formatAmount(budget.adjustedRemaining ?? budget.remaining)}
            </div>
          </div>
          <div className="progress-bar">
            <div
              className={`progress ${getProgressColor(budget.percentage)}`}
              style={{ width: `${Math.min(budget.percentage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* 预算统计 */}
        <div className="budget-stats">
          <div className="stat-item">
            <div className="stat-label">剩余天数</div>
            <div className="stat-value">{budget.daysRemaining}天</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">日均消费</div>
            <div className="stat-value">{formatAmount(budget.dailySpent)}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">日均可用</div>
            <div className="stat-value">{formatAmount(budget.dailyAvailable)}</div>
          </div>
        </div>
      </div>

      {/* 结转历史对话框 */}
      {isRolloverHistoryOpen && (
        <RolloverHistoryDialog
          history={rolloverHistory}
          onClose={toggleRolloverHistory}
        />
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={toggleDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除预算</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除该预算及其相关数据，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
