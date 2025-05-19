'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { useBudgetEditStore } from '@/store/budget-edit-store';
import { categoryService } from '@/lib/api/category-service';
import { BudgetTypeInfo } from './budget-edit/budget-type-info';
import { BudgetBasicInfoForm } from './budget-edit/budget-basic-info-form';
import { PersonalBudgetTimeSettings } from './budget-edit/personal-budget-time-settings';
import { GeneralBudgetTimeSettings } from './budget-edit/general-budget-time-settings';
import { CategoryBudgetSettings } from './budget-edit/category-budget-settings';
import { RolloverInfo } from './budget-edit/rollover-info';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// 导入预算编辑页面样式
import '@/styles/budget-edit.css';

export function BudgetEditPage() {
  const params = useParams();
  const router = useRouter();
  const budgetId = params?.id as string;

  // 获取预算编辑状态
  const {
    budgetType,
    name,
    enableRollover,
    enableCategoryBudget,
    isLoading,
    isSubmitting,
    error,
    loadBudgetData,
    submitForm,
    resetForm,
    setCategories
  } = useBudgetEditStore();

  // 加载预算数据
  useEffect(() => {
    if (budgetId) {
      loadBudgetData(budgetId);
    }

    // 组件卸载时重置表单
    return () => resetForm();
  }, [budgetId, loadBudgetData, resetForm]);

  // 获取支出分类列表
  const { data: categoriesData = [] } = useQuery({
    queryKey: ['categories', 'EXPENSE'],
    queryFn: () => categoryService.getCategories({ type: 'EXPENSE' }),
    onSuccess: (data) => {
      setCategories(data);
    }
  });

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm();
  };

  // 处理返回按钮点击
  const handleBack = () => {
    router.back();
  };

  // 右侧操作按钮
  const rightActions = (
    <button
      className="icon-button save-button"
      onClick={handleSubmit}
      disabled={isSubmitting}
      title="保存修改"
    >
      <i className="fas fa-check"></i>
    </button>
  );

  // 如果正在加载，显示骨架屏
  if (isLoading) {
    return (
      <PageContainer
        title="编辑预算"
        showBackButton={true}
        onBackClick={handleBack}
        rightActions={rightActions}
        activeNavItem="budget"
      >
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-60 w-full rounded-lg" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="编辑预算"
      showBackButton={true}
      onBackClick={handleBack}
      rightActions={rightActions}
      activeNavItem="budget"
    >
      <form className="budget-form" onSubmit={handleSubmit}>
        {/* 预算类型信息 */}
        <div className="form-section">
          <BudgetTypeInfo type={budgetType} />
        </div>

        {/* 基本信息 */}
        <div className="form-section">
          <div className="section-title">基本信息</div>
          <BudgetBasicInfoForm />
        </div>

        {/* 时间设置 - 根据预算类型显示不同的组件 */}
        <div className="form-section">
          <div className="section-title">时间设置</div>
          {budgetType === 'PERSONAL' ? (
            <PersonalBudgetTimeSettings />
          ) : (
            <GeneralBudgetTimeSettings />
          )}
        </div>

        {/* 分类预算设置 */}
        <div className="form-section">
          <CategoryBudgetSettings />
        </div>

        {/* 当前结转信息 - 仅个人预算且启用结转时显示 */}
        {budgetType === 'PERSONAL' && enableRollover && (
          <div className="form-section" id="rollover-info-section">
            <div className="section-title">结转情况</div>
            <RolloverInfo />
          </div>
        )}

        {/* 提交按钮 */}
        <button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? '保存中...' : '保存修改'}
        </button>
      </form>
    </PageContainer>
  );
}
