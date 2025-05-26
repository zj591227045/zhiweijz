"use client";

import { PageContainer } from "@/components/layout/page-container";
import { BudgetForm } from "@/components/budgets/budget-form/budget-form";

export default function AddBudgetPage() {
  return (
    <PageContainer
      title="添加预算"
      showBackButton={true}
      activeNavItem="budget"
    >
      <BudgetForm mode="create" />
    </PageContainer>
  );
} 