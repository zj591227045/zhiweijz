'use client';

interface BudgetTypeSelectorProps {
  activeType: 'personal' | 'general';
  onChange: (type: 'personal' | 'general') => void;
}

export function BudgetTypeSelector({ activeType, onChange }: BudgetTypeSelectorProps) {
  return (
    <div className="budget-selector">
      <div className="budget-tabs">
        <button
          className={`budget-tab ${activeType === 'personal' ? 'active' : ''}`}
          onClick={() => onChange('personal')}
        >
          个人预算
        </button>
        <button
          className={`budget-tab ${activeType === 'general' ? 'active' : ''}`}
          onClick={() => onChange('general')}
        >
          通用预算
        </button>
      </div>
    </div>
  );
}
