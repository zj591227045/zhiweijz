'use client';

import { useBudgetStore } from '@/store/budget-store';

export function MonthSelector() {
  const { budgetType, currentPeriod, nextMonth, prevMonth } = useBudgetStore();

  return (
    <div className="month-selector">
      <button
        className="month-nav-button"
        onClick={prevMonth}
      >
        <i className="fas fa-chevron-left"></i>
      </button>
      <div className="current-month">{currentPeriod.displayText}</div>
      <button
        className="month-nav-button"
        onClick={nextMonth}
      >
        <i className="fas fa-chevron-right"></i>
      </button>
    </div>
  );
}
