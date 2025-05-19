'use client';

import { useRouter } from 'next/navigation';

interface BudgetOverviewProps {
  overview: {
    id: string;
    name: string;
    period: string;
    amount: number;
    spent: number;
    remaining: number;
    percentage: number;
    rollover: number;
    daysRemaining: number;
    dailySpent: number;
    dailyAvailable: number;
  };
}

export function BudgetOverview({ overview }: BudgetOverviewProps) {
  const router = useRouter();

  // 处理结转历史按钮点击
  const handleRolloverHistoryClick = () => {
    router.push(`/budgets/${overview.id}/rollover-history`);
  };

  // 格式化金额
  const formatAmount = (amount: number, showDecimals = true) => {
    return `¥${amount.toLocaleString(undefined, {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0
    })}`;
  };

  // 确定进度条颜色
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    return '';
  };

  // 确定结转徽章样式
  const getRolloverBadgeClass = (rollover: number) => {
    return rollover >= 0 ? 'positive' : 'negative';
  };

  return (
    <div className="overview-card">
      <div className="budget-name">{overview.name}</div>
      <div className="budget-period">{overview.period}</div>
      <div className="budget-amount">{formatAmount(overview.amount, false)}</div>

      {/* 结转信息 */}
      <div className="rollover-info">
        <div className={`rollover-badge ${getRolloverBadgeClass(overview.rollover)}`}>
          <i className="fas fa-exchange-alt"></i>
          <span>本月结转: {overview.rollover >= 0 ? '+' : ''}{formatAmount(overview.rollover)}</span>
        </div>
        <button className="rollover-history-button" onClick={handleRolloverHistoryClick}>
          <i className="fas fa-history"></i>
          <span>结转历史</span>
        </button>
      </div>

      {/* 预算进度 - 优化样式 */}
      <div className="budget-progress-container">
        <div className="budget-progress-info">
          <div className="spent-amount">
            已用: {formatAmount(overview.spent)} ({overview.percentage.toFixed(1)}%)
          </div>
          <div className={`remaining-amount ${overview.remaining >= 0 ? 'positive' : 'negative'}`}>
            剩余: {formatAmount(overview.remaining)}
          </div>
        </div>
        <div className="progress-bar">
          <div
            className={`progress ${getProgressColor(overview.percentage)}`}
            style={{ width: `${Math.min(overview.percentage, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* 预算统计 - 美化样式 */}
      <div className="budget-stats">
        <div className="stat-item">
          <div className="stat-value">{overview.daysRemaining}天</div>
          <div className="stat-label">剩余天数</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatAmount(overview.dailySpent, false)}</div>
          <div className="stat-label">日均消费</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatAmount(overview.dailyAvailable, false)}</div>
          <div className="stat-label">日均可用</div>
        </div>
      </div>
    </div>
  );
}
