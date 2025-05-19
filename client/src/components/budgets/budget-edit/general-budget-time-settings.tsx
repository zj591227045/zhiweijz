'use client';

import { useBudgetEditStore } from '@/store/budget-edit-store';
import { ToggleSwitch } from '@/components/ui/toggle-switch';

export function GeneralBudgetTimeSettings() {
  const {
    startDate,
    endDate,
    isUnlimited,
    setStartDate,
    setEndDate,
    toggleUnlimited
  } = useBudgetEditStore();

  // 处理开始日期变更
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  };

  // 处理结束日期变更
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  };

  // 处理无期限预算开关变更
  const handleUnlimitedToggle = (checked: boolean) => {
    toggleUnlimited();
  };

  return (
    <>
      <div className="form-group">
        <label htmlFor="budget-start-date">开始日期</label>
        <div className="date-input">
          <input
            type="date"
            id="budget-start-date"
            value={startDate}
            onChange={handleStartDateChange}
            required
          />
          <i className="fas fa-calendar"></i>
        </div>
      </div>

      {!isUnlimited && (
        <div className="form-group">
          <label htmlFor="budget-end-date">结束日期</label>
          <div className="date-input">
            <input
              type="date"
              id="budget-end-date"
              value={endDate}
              onChange={handleEndDateChange}
              min={startDate}
              required={!isUnlimited}
            />
            <i className="fas fa-calendar"></i>
          </div>
        </div>
      )}

      <div className="form-group">
        <div className="toggle-container">
          <span>无期限预算</span>
          <ToggleSwitch
            id="unlimited-budget"
            checked={isUnlimited}
            onChange={handleUnlimitedToggle}
          />
        </div>
        <div className="help-text">
          <i className="fas fa-info-circle"></i>
          <span>启用无期限预算后，预算将没有结束日期</span>
        </div>
      </div>
    </>
  );
}
