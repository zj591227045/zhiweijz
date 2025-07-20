'use client';

import { memo } from 'react';
import { DailyStats } from '@/store/calendar-store';
import './date-cell.css';

interface DateCellProps {
  date: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  dailyStats?: DailyStats;
  displayMode: 'expense' | 'income';
  onClick: (date: string) => void;
  fullDate: string; // YYYY-MM-DD
}

export const DateCell = memo(function DateCell({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  dailyStats,
  displayMode,
  onClick,
  fullDate,
}: DateCellProps) {
  const handleClick = () => {
    if (isCurrentMonth) {
      onClick(fullDate);
    }
  };

  // 获取显示金额
  const getDisplayAmount = () => {
    if (!dailyStats) return 0;
    return displayMode === 'expense' ? dailyStats.expense : dailyStats.income;
  };

  // 格式化金额显示
  const formatAmount = (amount: number) => {
    if (amount === 0) return '';

    // 格式化数字，最多显示2位小数，去掉末尾的0
    const formatNumber = (num: number) => {
      return parseFloat(num.toFixed(2)).toString();
    };

    if (amount >= 1000) {
      return `${formatNumber(amount / 1000)}k`;
    }

    // 直接返回金额，不添加正负号（通过CSS颜色区分支出和收入）
    return formatNumber(amount);
  };

  const displayAmount = getDisplayAmount();
  const hasData = dailyStats && dailyStats.count > 0;

  return (
    <div
      className={`date-cell ${isCurrentMonth ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasData ? 'has-data' : ''}`}
      onClick={handleClick}
    >
      <div className="date-number">{date}</div>
      {hasData && <div className={`amount ${displayMode}`}>{formatAmount(displayAmount)}</div>}
    </div>
  );
});
