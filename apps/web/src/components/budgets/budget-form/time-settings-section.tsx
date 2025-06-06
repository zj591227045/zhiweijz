'use client';

import { useBudgetFormStore } from '@/store/budget-form-store';

export function TimeSettingsSection() {
  const {
    mode,
    budgetType,
    startDate,
    endDate,
    isUnlimited,
    refreshDay,
    enableRollover,
    errors,
    setStartDate,
    setEndDate,
    toggleUnlimited,
    setRefreshDay,
    toggleRollover,
  } = useBudgetFormStore();

  // 处理开始日期变更
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  };

  // 处理结束日期变更
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  };

  // 处理无期限切换
  const handleUnlimitedToggle = () => {
    toggleUnlimited();
  };

  // 处理刷新日期变更
  const handleRefreshDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRefreshDay(parseInt(e.target.value, 10));
  };

  // 处理结转切换
  const handleRolloverToggle = () => {
    toggleRollover();
  };

  // 如果是编辑模式且是个人预算，显示个人预算的时间设置
  if (mode === 'edit' && budgetType === 'PERSONAL') {
    return (
      <div className="form-section">
        <div className="section-title">
          <i className="fas fa-calendar"></i>
          时间设置
        </div>

        <div className="form-group">
          <label htmlFor="budget-refresh-day">刷新日期</label>
          <select id="budget-refresh-day" value={refreshDay} onChange={handleRefreshDayChange}>
            <option value="1">每月1日</option>
            <option value="5">每月5日</option>
            <option value="10">每月10日</option>
            <option value="15">每月15日</option>
            <option value="20">每月20日</option>
            <option value="25">每月25日</option>
          </select>
          <div className="help-text">
            <i className="fas fa-info-circle"></i>
            <span>预算将在每月的这一天重置</span>
          </div>
        </div>

        <div className="form-group">
          <div className="toggle-container">
            <span>启用结转</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={enableRollover} onChange={handleRolloverToggle} />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="help-text">
            <i className="fas fa-info-circle"></i>
            <span>启用结转后，当月未花完的预算将结转到下个月，超支的金额将从下个月扣除</span>
          </div>
        </div>
      </div>
    );
  }

  // 通用预算或创建模式的时间设置
  return (
    <div className="form-section">
      <div className="section-title">
        <i className="fas fa-calendar"></i>
        时间设置
      </div>

      <div className="form-group">
        <label htmlFor="budget-start-date">开始日期</label>
        <div className="date-input">
          <input
            type="date"
            id="budget-start-date"
            value={startDate}
            onChange={handleStartDateChange}
          />
          <i className="fas fa-calendar"></i>
        </div>
        {errors.startDate && <div className="error-message">{errors.startDate}</div>}
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
            />
            <i className="fas fa-calendar"></i>
          </div>
          {errors.endDate && <div className="error-message">{errors.endDate}</div>}
        </div>
      )}

      <div className="form-group">
        <div className="toggle-container">
          <span>无期限预算</span>
          <label className="toggle-switch">
            <input type="checkbox" checked={isUnlimited} onChange={handleUnlimitedToggle} />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="help-text">
          <i className="fas fa-info-circle"></i>
          <span>启用无期限预算后，预算将没有结束日期</span>
        </div>
      </div>
    </div>
  );
}
