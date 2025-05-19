'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { useBudgetAddStore } from '@/store/budget-add-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { categoryService } from '@/lib/api/category-service';
import { BudgetTypeCard } from './budget-type-card';
import { BudgetBasicInfoForm } from './budget-basic-info-form';
import { BudgetTimeSettings } from './budget-time-settings';
import { CategoryBudgetSettings } from './category-budget-settings';

export function BudgetAddPage() {
  const router = useRouter();
  const { currentAccountBook } = useAccountBookStore();
  const {
    setActiveAccountBook,
    setCategories,
    submitForm,
    isSubmitting,
    validateForm
  } = useBudgetAddStore();

  // 设置当前激活账本
  useEffect(() => {
    if (currentAccountBook) {
      setActiveAccountBook(currentAccountBook);
    }
  }, [currentAccountBook, setActiveAccountBook]);

  // 获取支出分类列表
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'EXPENSE'],
    queryFn: () => categoryService.getCategories({ type: 'EXPENSE' }),
    onSuccess: (data) => {
      console.log('获取到分类数据:', data);
      setCategories(data);
    },
    staleTime: 1000 * 60 * 5, // 5分钟内不重新获取
    refetchOnWindowFocus: false
  });

  // 处理返回按钮点击
  const handleBackClick = () => {
    router.push('/budgets/list');
  };

  // 处理保存按钮点击
  const handleSaveClick = async () => {
    // 验证表单
    if (!validateForm()) {
      return;
    }

    // 提交表单
    const success = await submitForm();
    if (success) {
      router.push('/budgets/list');
    }
  };

  // 右侧操作按钮
  const rightActions = (
    <button
      className="icon-button save-button"
      onClick={handleSaveClick}
      disabled={isSubmitting}
    >
      <i className="fas fa-check"></i>
    </button>
  );

  return (
    <PageContainer
      title="添加预算"
      showBackButton={true}
      onBackClick={handleBackClick}
      rightActions={rightActions}
      activeNavItem="budget"
    >
      <form className="budget-form">
        {/* 预算类型说明 */}
        <div className="form-section">
          <BudgetTypeCard />
        </div>

        {/* 基本信息 */}
        <div className="form-section">
          <div className="section-title">基本信息</div>
          <BudgetBasicInfoForm />
        </div>

        {/* 时间设置 */}
        <div className="form-section">
          <div className="section-title">时间设置</div>
          <BudgetTimeSettings />
        </div>

        {/* 分类预算设置 */}
        <div className="form-section">
          <CategoryBudgetSettings />
        </div>

        {/* 提交按钮 */}
        <button
          type="button"
          className="submit-button"
          onClick={handleSaveClick}
          disabled={isSubmitting}
        >
          {isSubmitting ? '保存中...' : '保存预算'}
        </button>
      </form>
    </PageContainer>
  );
}
