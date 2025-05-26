"use client";

import { useBudgetFormStore } from "@/store/budget-form-store";

export function RolloverInfoSection() {
  const { previousRollover, estimatedRollover } = useBudgetFormStore();
  
  // 格式化金额，添加正负号
  const formatAmount = (amount: number | null) => {
    if (amount === null) return '¥0.00';
    
    const prefix = amount >= 0 ? '+' : '';
    return `${prefix}¥${Math.abs(amount).toFixed(2)}`;
  };
  
  // 确定CSS类名
  const getRolloverClass = (amount: number | null) => {
    if (amount === null) return '';
    return amount >= 0 ? 'positive' : 'negative';
  };
  
  return (
    <div className="form-section">
      <div className="section-title">
        <i className="fas fa-exchange-alt"></i>
        结转情况
      </div>
      
      <div className="rollover-info">
        <div className="rollover-item">
          <span className="rollover-label">上月结转:</span>
          <span className={`rollover-value ${getRolloverClass(previousRollover)}`}>
            {formatAmount(previousRollover)}
          </span>
        </div>
        <div className="rollover-item">
          <span className="rollover-label">本月预计结转:</span>
          <span className={`rollover-value ${getRolloverClass(estimatedRollover)}`}>
            {formatAmount(estimatedRollover)}
          </span>
        </div>
      </div>
    </div>
  );
} 