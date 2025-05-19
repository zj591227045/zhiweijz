'use client';

import { useBudgetEditStore } from '@/store/budget-edit-store';
import { Switch } from '@/components/ui/switch';

export function PersonalBudgetTimeSettings() {
  const { refreshDay, enableRollover, setRefreshDay, toggleRollover } = useBudgetEditStore();

  // 处理刷新日期变更
  const handleRefreshDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRefreshDay(parseInt(e.target.value, 10));
  };

  // 处理结转开关变更
  const handleRolloverToggle = (checked: boolean) => {
    toggleRollover();
  };

  return (
    <>
      <div className="form-group">
        <label htmlFor="budget-refresh-day">刷新日期</label>
        <select
          id="budget-refresh-day"
          className="form-select"
          value={refreshDay}
          onChange={handleRefreshDayChange}
        >
          <option value="1">每月1日</option>
          <option value="5">每月5日</option>
          <option value="10">每月10日</option>
          <option value="15">每月15日</option>
          <option value="20">每月20日</option>
          <option value="25">每月25日</option>
        </select>
      </div>

      <div className="form-group">
        <div className="toggle-container">
          <span>启用结转</span>
          <Switch
            id="enable-rollover"
            checked={enableRollover}
            onCheckedChange={handleRolloverToggle}
          />
        </div>
        <div className="help-text">
          <i className="fas fa-info-circle"></i>
          <span>启用结转后，当月未花完的预算将结转到下个月，超支的金额将从下个月扣除。</span>
        </div>
      </div>
    </>
  );
}
