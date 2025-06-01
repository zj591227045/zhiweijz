'use client';

import { useEffect } from 'react';
import { useBudgetStatisticsStore } from '@/store/budget-statistics-store';
import { RolloverHistoryDialog } from '@/components/budgets/rollover-history-dialog';

interface BudgetOverviewProps {
  overview: {
    id: string;
    name: string;
    period: string;
    amount: number;
    spent: number;
    remaining: number;
    adjustedRemaining?: number; // 考虑结转后的剩余金额
    percentage: number;
    rollover: number;
    daysRemaining: number;
    dailySpent: number;
    dailyAvailable: number;
  };
}

export function BudgetOverview({ overview }: BudgetOverviewProps) {
  const {
    rolloverHistory,
    isRolloverHistoryOpen,
    toggleRolloverHistory,
    fetchRolloverHistory,
    fetchUserRolloverHistory
  } = useBudgetStatisticsStore();

  // 处理结转历史按钮点击
  const handleRolloverHistoryClick = async () => {
    try {
      // 导入账本store获取当前账本ID
      const { useAccountBookStore } = await import('@/store/account-book-store');
      const { currentAccountBook } = useAccountBookStore.getState();

      if (currentAccountBook) {
        // 使用新的用户级别API获取结转历史
        await fetchUserRolloverHistory(currentAccountBook.id, 'PERSONAL');
        toggleRolloverHistory();
      } else {
        // 降级到旧版本API
        await fetchRolloverHistory(overview.id);
        toggleRolloverHistory();
      }
    } catch (error) {
      console.error('获取结转历史失败:', error);
      // 降级到旧版本API
      await fetchRolloverHistory(overview.id);
      toggleRolloverHistory();
    }
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
    <>
      <div className="overview-card" style={{ padding: '12px' }}>

        {/* 结转信息和预算金额横向对齐 */}
        <div className="budget-info-row" style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <div className="budget-amount-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div className="budget-amount-label">&nbsp;&nbsp;&nbsp;预算金额</div>
            <div className="budget-amount">{formatAmount(overview.amount, false)}</div>
          </div>

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
        </div>

        {/* 结转历史对话框 */}
        {isRolloverHistoryOpen && (
          <RolloverHistoryDialog
            history={rolloverHistory}
            onClose={toggleRolloverHistory}
          />
        )}

      {/* 预算进度 - 优化样式 */}
      <div className="budget-progress-container" style={{ marginBottom: '4px' }}>
        <div className="budget-progress-info">
          {/* 计算调整后的百分比：已用金额/(预算金额+结转金额) */}
          {(() => {
            const adjustedTotal = overview.amount + overview.rollover;
            const adjustedPercentage = adjustedTotal > 0
              ? (overview.spent / adjustedTotal) * 100
              : 0;
            return (
              <div className="spent-amount">
                已用: {formatAmount(overview.spent)} ({adjustedPercentage.toFixed(1)}%)
              </div>
            );
          })()}
          <div className={`remaining-amount ${(overview.amount + overview.rollover - overview.spent) >= 0 ? 'positive' : 'negative'}`}>
            剩余: {formatAmount(overview.amount + overview.rollover - overview.spent)}
          </div>
        </div>
        <div className="progress-bar">
          {/* 使用调整后的百分比计算进度条宽度 */}
          {(() => {
            const adjustedTotal = overview.amount + overview.rollover;
            const adjustedPercentage = adjustedTotal > 0
              ? (overview.spent / adjustedTotal) * 100
              : 0;
            return (
              <div
                className={`progress ${getProgressColor(adjustedPercentage)}`}
                style={{ width: `${Math.min(adjustedPercentage, 100)}%` }}
              ></div>
            );
          })()}
        </div>
      </div>

      {/* 预算统计 - 强制横向排列 */}
      <div className="budget-stats-row" style={{ marginTop: '4px' }}>
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
    </>
  );
}
