'use client';

import { useState } from 'react';
import { useBudgetEditStore } from '@/store/budget-edit-store';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { RolloverConfirmDialog } from './rollover-confirm-dialog';
import { toast } from 'sonner';

export function PersonalBudgetTimeSettings() {
  const { refreshDay, enableRollover, amount, setRefreshDay, toggleRollover } = useBudgetEditStore();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  // 处理刷新日期变更
  const handleRefreshDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRefreshDay(parseInt(e.target.value, 10));
  };

  // 处理结转开关变更
  const handleRolloverToggle = (checked: boolean) => {
    // 如果是关闭结转，直接执行
    if (enableRollover) {
      toggleRollover();
      return;
    }

    // 如果是开启结转，先检查预算金额
    if (amount <= 0) {
      toast.error('请先设置预算金额，再启用结转功能');
      return;
    }

    // 打开确认对话框
    setIsConfirmDialogOpen(true);
  };

  // 确认启用结转
  const handleConfirmRollover = () => {
    toggleRollover();
    setIsConfirmDialogOpen(false);
    toast.success('已成功启用预算结转功能');
  };

  // 取消启用结转
  const handleCancelRollover = () => {
    setIsConfirmDialogOpen(false);
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
          <ToggleSwitch
            id="enable-rollover"
            checked={enableRollover}
            onChange={handleRolloverToggle}
          />
        </div>
        <div className="help-text">
          <i className="fas fa-info-circle"></i>
          <span>启用结转后，当月未花完的预算将结转到下个月，超支的金额将从下个月扣除。</span>
        </div>
      </div>

      {/* 结转确认对话框 */}
      <RolloverConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={handleCancelRollover}
        onConfirm={handleConfirmRollover}
      />
    </>
  );
}
