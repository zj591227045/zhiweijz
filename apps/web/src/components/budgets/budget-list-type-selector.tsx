'use client';

import { cn } from '@/lib/utils';

export type BudgetType = 'PERSONAL' | 'GENERAL';

interface BudgetListTypeSelectorProps {
  selectedType: BudgetType;
  onTypeChange: (type: BudgetType) => void;
}

export function BudgetListTypeSelector({
  selectedType,
  onTypeChange,
}: BudgetListTypeSelectorProps) {
  return (
    <div className="budget-type-selector">
      <button
        className={cn('type-button', selectedType === 'PERSONAL' && 'active')}
        onClick={() => onTypeChange('PERSONAL')}
      >
        个人预算
      </button>
      <button
        className={cn('type-button', selectedType === 'GENERAL' && 'active')}
        onClick={() => onTypeChange('GENERAL')}
      >
        通用预算
      </button>
    </div>
  );
}
