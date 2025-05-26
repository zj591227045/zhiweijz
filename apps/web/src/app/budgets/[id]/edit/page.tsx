"use client";

import { PageContainer } from "@/components/layout/page-container";
import { BudgetForm } from "@/components/budgets/budget-form/budget-form";

interface EditBudgetPageProps {
  params: {
    id: string;
  };
}

export default function EditBudgetPage({ params }: EditBudgetPageProps) {
  return (
    <PageContainer
      title="编辑预算"
      showBackButton={true}
      activeNavItem="budget"
    >
      <BudgetForm mode="edit" budgetId={params.id} />
    </PageContainer>
  );
} 