'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@zhiweijz/web';
import { PageContainer } from '@/components/layout/page-container';
import { useBudgetListStore } from '@/store/budget-list-store';
import { useAccountBookStore } from '@zhiweijz/web';
import { BudgetListTypeSelector } from './budget-list-type-selector';
import { BudgetListCard } from './budget-list-card';
import { Budget } from './budget-list-card';

export function BudgetListPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { currentAccountBook } = useAccountBookStore();
  const {
    personalBudgets,
    generalBudgets,
    selectedType,
    isLoading,
    error,
    fetchBudgets,
    setSelectedType,
    deleteBudget,
    resetState
  } = useBudgetListStore();

  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 初始化加载预算列表
  useEffect(() => {
    if (currentAccountBook?.id) {
      fetchBudgets(currentAccountBook.id);
    }

    // 组件卸载时重置状态
    return () => resetState();
  }, [currentAccountBook?.id, fetchBudgets, resetState]);

  // 处理预算类型切换
  const handleTypeChange = (type: 'PERSONAL' | 'GENERAL') => {
    setSelectedType(type);
  };

  // 处理添加预算
  const handleAddBudget = () => {
    router.push('/budgets/add');
  };

  // 处理删除预算
  const handleDeleteBudget = async () => {
    if (!budgetToDelete) return;

    setIsDeleting(true);
    const success = await deleteBudget(budgetToDelete);
    setIsDeleting(false);
    setShowDeleteConfirm(false);

    if (success) {
      setBudgetToDelete(null);
    }
  };

  // 确定当前显示的预算列表
  const currentBudgets = selectedType === 'PERSONAL' ? personalBudgets : generalBudgets;

  // 渲染预算列表
  const renderBudgetList = () => {
    if (isLoading) {
      return (
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>加载中...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-state">
          <i className="fas fa-exclamation-circle"></i>
          <p>{error}</p>
          <button
            className="retry-button"
            onClick={() => currentAccountBook?.id && fetchBudgets(currentAccountBook.id)}
          >
            重试
          </button>
        </div>
      );
    }

    if (currentBudgets.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-piggy-bank"></i>
          <p>
            {selectedType === 'PERSONAL'
              ? '您还没有个人预算，个人预算会在创建账本时自动创建'
              : '您还没有通用预算，点击下方按钮添加'}
          </p>
        </div>
      );
    }

    return currentBudgets.map((budget: Budget) => (
      <BudgetListCard
        key={budget.id}
        budget={budget}
        onDelete={(id) => {
          setBudgetToDelete(id);
          setShowDeleteConfirm(true);
        }}
      />
    ));
  };

  // 右侧操作按钮
  const rightActions = (
    <>
      <button className="icon-button" onClick={handleAddBudget}>
        <i className="fas fa-plus"></i>
      </button>
    </>
  );

  return (
    <PageContainer title="预算管理" rightActions={rightActions} activeNavItem="budget">
      {/* 预算类型选择器 */}
      <BudgetListTypeSelector
        selectedType={selectedType}
        onTypeChange={handleTypeChange}
      />

      {/* 预算统计链接 */}
      <div className="statistics-link-container">
        <button
          className="statistics-link"
          onClick={() => router.push('/budgets/statistics')}
        >
          <i className="fas fa-chart-line"></i>
          <span>查看预算统计</span>
        </button>
      </div>

      <section className="budget-section active">
        <div className="section-header">
          <h2>
            {selectedType === 'PERSONAL' ? '个人预算' : '通用预算'}
          </h2>
          <div className="section-description">
            {selectedType === 'PERSONAL'
              ? '每月自动刷新的个人预算'
              : '长期或无期限的通用预算'}
          </div>
        </div>

        {/* 预算列表 */}
        <div className="budget-list">
          {renderBudgetList()}
        </div>

        {/* 添加通用预算按钮 - 仅在通用预算页面显示 */}
        {selectedType === 'GENERAL' && (
          <button
            className="add-budget-button"
            onClick={handleAddBudget}
          >
            <i className="fas fa-plus"></i>
            <span>添加通用预算</span>
          </button>
        )}
      </section>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>确认删除预算</h3>
            </div>
            <div className="modal-body">
              <p>删除预算后，相关的数据将无法恢复。确定要删除此预算吗？</p>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setBudgetToDelete(null);
                }}
                disabled={isDeleting}
              >
                取消
              </button>
              <button
                className="delete-button"
                onClick={handleDeleteBudget}
                disabled={isDeleting}
              >
                {isDeleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
