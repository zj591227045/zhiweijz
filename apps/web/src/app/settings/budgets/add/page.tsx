'use client';

import { PageContainer } from '@/components/layout/page-container';
import { BudgetForm } from '@/components/budgets/budget-form/budget-form';

export default function AddBudgetPage() {
  return (
    <PageContainer
      title="添加预算"
      showBackButton={true}
      onBackClick={() => window.history.back()}
      showBottomNav={false}
    >
      <BudgetForm mode="create" />
    </PageContainer>
  );
}
