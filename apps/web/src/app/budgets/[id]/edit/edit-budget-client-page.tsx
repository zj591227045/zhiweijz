'use client';

import { PageContainer } from '@/components/layout/page-container';
import { BudgetForm } from '@/components/budgets/budget-form/budget-form';

interface EditBudgetClientPageProps {
  budgetId: string;
}

export function EditBudgetClientPage({ budgetId }: EditBudgetClientPageProps) {
  return (
    <PageContainer title="编辑预算" showBackButton={true} activeNavItem="budget">
      <BudgetForm mode="edit" budgetId={budgetId} />
    </PageContainer>
  );
}
