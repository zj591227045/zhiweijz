'use client';

import { useBudgetStore } from '@/store/budget-store';

export function BudgetTypeSelector() {
  const { budgetType, setBudgetType } = useBudgetStore();

  return (
    <div className="budget-type-selector">
      <button
        className={`budget-type-button ${budgetType === 'MONTHLY' ? 'active' : ''}`}
        onClick={() => setBudgetType('MONTHLY')}
      >
        月度预算
      </button>
      <button
        className={`budget-type-button ${budgetType === 'YEARLY' ? 'active' : ''}`}
        onClick={() => setBudgetType('YEARLY')}
      >
        年度预算
      </button>
    </div>
  );
}
