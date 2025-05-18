'use client';

import { Budget } from '@/store/budget-detail-store';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';

interface BudgetHeaderProps {
  budget: Budget | null;
  onRolloverHistoryClick: () => void;
}

export function BudgetHeader({ budget, onRolloverHistoryClick }: BudgetHeaderProps) {
  if (!budget) return null;

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format('YYYY年MM月DD日');
  };

  // 获取图标类名
  const getIconClass = (icon: string | undefined) => {
    if (!icon) return 'fa-money-bill';
    return icon.startsWith('fa-') ? icon : `fa-${icon}`;
  };

  return (
    <div className="budget-header">
      <div className="budget-name">{budget.name}</div>

      {budget.categoryId && (
        <div className="category-info">
          <div className="category-icon">
            <i className={`fas ${getIconClass(budget.categoryIcon)}`}></i>
          </div>
          <div className="category-name">{budget.categoryName}</div>
        </div>
      )}

      <div className="budget-period">
        {formatDate(budget.startDate)} - {formatDate(budget.endDate)}
      </div>

      <div className="budget-amount">
        {formatCurrency(budget.amount)}
      </div>

      {/* 结转信息 */}
      {budget.rollover && budget.rolloverAmount !== undefined && (
        <div className="rollover-info">
          <div className={`rollover-badge ${budget.rolloverAmount >= 0 ? 'positive' : 'negative'}`}>
            <i className="fas fa-exchange-alt"></i>
            <span>本月结转: {budget.rolloverAmount >= 0 ? '+' : ''}{formatCurrency(Math.abs(budget.rolloverAmount))}</span>
          </div>
          <button
            className="rollover-history-button"
            onClick={onRolloverHistoryClick}
          >
            <i className="fas fa-history"></i>
            <span>结转历史</span>
          </button>
        </div>
      )}

      {/* 预算进度 */}
      <div className="budget-progress-container">
        <div className="budget-progress-info">
          <div className="spent-amount">
            已用: {formatCurrency(budget.spent)} ({isNaN(budget.percentage) ? '0' : Math.round(budget.percentage)}%)
          </div>
          <div className={`remaining-amount ${budget.remaining >= 0 ? 'positive' : 'negative'}`}>
            剩余: {budget.remaining >= 0 ? formatCurrency(budget.remaining) : `-${formatCurrency(Math.abs(budget.remaining))}`}
          </div>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${
              isNaN(budget.percentage) ? 'normal' :
              budget.percentage > 100
                ? 'danger'
                : budget.percentage > 80
                  ? 'warning'
                  : 'normal'
            }`}
            style={{ width: `${isNaN(budget.percentage) ? 0 : Math.min(budget.percentage, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* 预算统计 */}
      <div className="budget-stats">
        <div className="stat-item">
          <div className="stat-value">{budget.daysRemaining}天</div>
          <div className="stat-label">剩余天数</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatCurrency(budget.dailySpent)}</div>
          <div className="stat-label">日均消费</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatCurrency(budget.dailyAvailable)}</div>
          <div className="stat-label">日均可用</div>
        </div>
      </div>
    </div>
  );
}
