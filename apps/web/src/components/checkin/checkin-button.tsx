'use client';

import React, { useEffect, useState } from 'react';
import { useAccountingPointsStore } from '../../store/accounting-points-store';
import { toast } from 'react-hot-toast';
import { haptic } from '@/utils/haptic-feedback';

interface CheckinButtonProps {
  className?: string;
  showBalance?: boolean;
}

export const CheckinButton: React.FC<CheckinButtonProps> = ({
  className = '',
  showBalance = true,
}) => {
  const { balance, checkinStatus, loading, error, fetchBalance, fetchCheckinStatus, checkin } =
    useAccountingPointsStore();

  const [isCheckinLoading, setIsCheckinLoading] = useState(false);

  useEffect(() => {
    // 初始加载数据
    fetchBalance();
    fetchCheckinStatus();
  }, [fetchBalance, fetchCheckinStatus]);

  const handleCheckin = async () => {
    if (checkinStatus?.hasCheckedIn || isCheckinLoading) {
      return;
    }

    // 立即触发震动反馈
    haptic.medium();

    setIsCheckinLoading(true);
    try {
      const result = await checkin();
      haptic.success(); // 签到成功震动
      toast.success(`${result.message} 获得 ${result.pointsAwarded} 记账点！`);
    } catch (error) {
      haptic.error(); // 签到失败震动
      toast.error(error instanceof Error ? error.message : '签到失败');
    } finally {
      setIsCheckinLoading(false);
    }
  };

  const hasCheckedIn = checkinStatus?.hasCheckedIn;
  const isDisabled = hasCheckedIn || isCheckinLoading || loading;

  return (
    <div className={`checkin-container ${className}`}>
      {showBalance && balance && (
        <div className="points-display">
          <div className="points-total">
            <span className="points-label">记账点余额：</span>
            <span className="points-value">{balance.totalBalance}</span>
          </div>
          <div className="points-breakdown">
            <span className="gift-points">赠送：{balance.giftBalance}</span>
            {balance.memberBalance > 0 && (
              <span className="member-points">会员：{balance.memberBalance}</span>
            )}
          </div>
        </div>
      )}

      <button
        className={`checkin-button ${hasCheckedIn ? 'checked-in' : ''} ${isDisabled ? 'disabled' : ''}`}
        onClick={handleCheckin}
        disabled={isDisabled}
      >
        {isCheckinLoading ? (
          <span className="loading-text">
            <i className="fas fa-spinner fa-spin"></i>
            签到中...
          </span>
        ) : hasCheckedIn ? (
          <span className="checked-in-text">
            <i className="fas fa-check-circle"></i>
            今日已签到
          </span>
        ) : (
          <span className="checkin-text">
            <i className="fas fa-calendar-check"></i>
            每日签到 +5
          </span>
        )}
      </button>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};
