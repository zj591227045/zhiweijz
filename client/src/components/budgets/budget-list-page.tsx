'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { useBudgetListStore } from '@/store/budget-list-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { BudgetListTypeSelector } from './budget-list-type-selector';
import { BudgetListCard } from './budget-list-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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

export function BudgetListPage() {
  const router = useRouter();
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

    if (success) {
      setBudgetToDelete(null);
    }
  };

  // 确定当前显示的预算列表
  const currentBudgets = selectedType === 'PERSONAL' ? personalBudgets : generalBudgets;

  // 渲染预算列表
  const renderBudgetList = () => {
    if (isLoading) {
      return Array(3).fill(0).map((_, index) => (
        <div key={index} className="mb-4">
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      ));
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <div className="text-destructive mb-2">
            <i className="fas fa-exclamation-circle text-2xl"></i>
          </div>
          <h3 className="text-lg font-semibold mb-2">加载失败</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button
            variant="outline"
            onClick={() => currentAccountBook?.id && fetchBudgets(currentAccountBook.id)}
          >
            重试
          </Button>
        </div>
      );
    }

    if (currentBudgets.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-muted-foreground mb-2">
            <i className="fas fa-piggy-bank text-2xl"></i>
          </div>
          <h3 className="text-lg font-semibold mb-2">暂无预算</h3>
          <p className="text-muted-foreground mb-4">
            {selectedType === 'PERSONAL'
              ? '您还没有个人预算，个人预算会在创建账本时自动创建'
              : '您还没有通用预算，点击下方按钮添加'}
          </p>
          {selectedType === 'GENERAL' && (
            <Button onClick={handleAddBudget}>
              <i className="fas fa-plus mr-2"></i>
              添加通用预算
            </Button>
          )}
        </div>
      );
    }

    return currentBudgets.map(budget => (
      <BudgetListCard
        key={budget.id}
        budget={budget}
        onDelete={(id) => setBudgetToDelete(id)}
      />
    ));
  };

  return (
    <PageContainer
      title="预算管理"
      showBackButton={true}
      rightActions={
        <button className="icon-button" onClick={handleAddBudget}>
          <i className="fas fa-plus"></i>
        </button>
      }
      activeNavItem="budget"
    >
      {/* 预算类型选择器 */}
      <BudgetListTypeSelector
        selectedType={selectedType}
        onTypeChange={handleTypeChange}
      />

      {/* 预算部分 */}
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

        {/* 添加通用预算按钮 - 仅在通用预算页面且有预算时显示 */}
        {selectedType === 'GENERAL' && generalBudgets.length > 0 && (
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
      <AlertDialog open={!!budgetToDelete} onOpenChange={(open) => !open && setBudgetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除预算</AlertDialogTitle>
            <AlertDialogDescription>
              删除预算后，相关的数据将无法恢复。确定要删除此预算吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBudget}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
