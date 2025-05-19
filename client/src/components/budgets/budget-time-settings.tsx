'use client';

import { useState } from 'react';
import { useBudgetAddStore } from '@/store/budget-add-store';
import dayjs from 'dayjs';

export function BudgetTimeSettings() {
  const {
    startDate,
    endDate,
    isUnlimited,
    errors,
    setStartDate,
    setEndDate,
    toggleUnlimited
  } = useBudgetAddStore();

  // 日期选择器状态
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // 格式化日期显示
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    return dayjs(dateString).format('YYYY/MM/DD');
  };

  // 处理开始日期变更
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    setShowStartDatePicker(false);
  };

  // 处理结束日期变更
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    setShowEndDatePicker(false);
  };

  // 处理无期限预算切换
  const handleUnlimitedToggle = () => {
    toggleUnlimited();
  };

  // 切换日期选择器显示
  const toggleStartDatePicker = () => {
    setShowStartDatePicker(!showStartDatePicker);
    if (showEndDatePicker) setShowEndDatePicker(false);
  };

  const toggleEndDatePicker = () => {
    setShowEndDatePicker(!showEndDatePicker);
    if (showStartDatePicker) setShowStartDatePicker(false);
  };

  // 设置为今天
  const setToday = () => {
    setStartDate(dayjs().format('YYYY-MM-DD'));
    setShowStartDatePicker(false);
  };

  // 设置为一个月后
  const setOneMonthLater = () => {
    setEndDate(dayjs().add(1, 'month').format('YYYY-MM-DD'));
    setShowEndDatePicker(false);
  };

  return (
    <>
      <div className="form-group">
        <label htmlFor="budget-start-date">开始日期</label>
        <div className="date-input-container">
          <div className="date-display" onClick={toggleStartDatePicker}>
            <span>{formatDateDisplay(startDate)}</span>
            <div className="date-icons">
              <i className="fas fa-calendar"></i>
            </div>
          </div>
        </div>
        {showStartDatePicker && (
          <div className="date-picker-modal">
            <div className="date-picker-overlay" onClick={() => setShowStartDatePicker(false)}></div>
            <div className="date-picker-content">
              <div className="date-picker-header">
                <span>选择开始日期</span>
                <button type="button" onClick={() => setShowStartDatePicker(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="date-picker-body">
                <input
                  type="date"
                  id="budget-start-date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  className="date-picker-input"
                />
              </div>
              <div className="date-picker-actions">
                <button
                  type="button"
                  className="date-picker-today"
                  onClick={setToday}
                >
                  今天
                </button>
                <button
                  type="button"
                  className="date-picker-confirm"
                  onClick={() => setShowStartDatePicker(false)}
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        )}
        {errors.startDate && <div className="error-message">{errors.startDate}</div>}
      </div>

      {!isUnlimited && (
        <div className="form-group">
          <label htmlFor="budget-end-date">结束日期</label>
          <div className="date-input-container">
            <div className="date-display" onClick={toggleEndDatePicker}>
              <span>{formatDateDisplay(endDate)}</span>
              <div className="date-icons">
                <i className="fas fa-calendar"></i>
              </div>
            </div>
          </div>
          {showEndDatePicker && (
            <div className="date-picker-modal">
              <div className="date-picker-overlay" onClick={() => setShowEndDatePicker(false)}></div>
              <div className="date-picker-content">
                <div className="date-picker-header">
                  <span>选择结束日期</span>
                  <button type="button" onClick={() => setShowEndDatePicker(false)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className="date-picker-body">
                  <input
                    type="date"
                    id="budget-end-date"
                    value={endDate}
                    onChange={handleEndDateChange}
                    className="date-picker-input"
                    min={startDate} // 确保结束日期不早于开始日期
                  />
                </div>
                <div className="date-picker-actions">
                  <button
                    type="button"
                    className="date-picker-today"
                    onClick={setOneMonthLater}
                  >
                    一个月后
                  </button>
                  <button
                    type="button"
                    className="date-picker-confirm"
                    onClick={() => setShowEndDatePicker(false)}
                  >
                    确定
                  </button>
                </div>
              </div>
            </div>
          )}
          {errors.endDate && <div className="error-message">{errors.endDate}</div>}
        </div>
      )}

      <div className="form-group">
        <div className="toggle-container">
          <span>无期限预算</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              id="unlimited-budget"
              checked={isUnlimited}
              onChange={handleUnlimitedToggle}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="help-text">
          <i className="fas fa-info-circle"></i>
          <span>启用无期限预算后，预算将没有结束日期</span>
        </div>
      </div>
    </>
  );
}
