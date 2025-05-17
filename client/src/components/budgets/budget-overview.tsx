'use client';

import { useBudgetStore } from '@/store/budget-store';
import { formatCurrency } from '@/lib/utils';

export function BudgetOverview() {
  const { budgetType, totalBudget } = useBudgetStore();

  // 添加调试日志
  console.log('BudgetOverview 组件渲染 - 总预算数据:', totalBudget);

  if (!totalBudget) {
    console.log('BudgetOverview 组件渲染 - 没有总预算数据');
    return (
      <div className="overview-card text-center">
        <p className="text-gray-500 dark:text-gray-400">暂无预算数据</p>
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          onClick={() => {
            console.log('手动刷新预算数据');
            // 强制刷新预算数据
            window.location.reload();
          }}
        >
          刷新数据
        </button>
      </div>
    );
  }

  // 确保所有必要的属性都存在，避免渲染错误
  const safeTotalBudget = {
    amount: totalBudget.amount || 0,
    spent: totalBudget.spent || 0,
    remaining: totalBudget.remaining || 0,
    percentage: totalBudget.percentage || 0,
    daysRemaining: totalBudget.daysRemaining || 0,
    rolloverAmount: totalBudget.rolloverAmount || 0,
    dailyAvailable: totalBudget.dailyAvailable || 0
  };

  return (
    <div className="budget-overview">
      <div className="overview-card">
        <div className="overview-header">
          <h2>
            {budgetType === 'MONTHLY' ? '月度预算' : '年度预算'}
          </h2>
          <div className="budget-status">
            剩余{safeTotalBudget.daysRemaining}天
          </div>
        </div>

        <div className="overview-amounts">
          <div className="amount-item">
            <div className="amount-label">总预算</div>
            <div className="amount-value">
              {formatCurrency(safeTotalBudget.amount)}
            </div>
          </div>
          <div className="amount-item">
            <div className="amount-label">已支出</div>
            <div className="amount-value">
              {formatCurrency(safeTotalBudget.spent)}
            </div>
          </div>
          <div className="amount-item">
            <div className="amount-label">剩余</div>
            <div className={`amount-value ${safeTotalBudget.percentage > 100 ? 'text-red-500' : ''}`}>
              {formatCurrency(safeTotalBudget.remaining)}
            </div>
          </div>
        </div>

        <div className="overall-progress">
          <div className={`progress-bar ${safeTotalBudget.percentage > 100 ? 'border-red-500' : ''}`}>
            <div
              className={`progress ${
                safeTotalBudget.percentage > 100
                  ? 'bg-red-500'
                  : safeTotalBudget.percentage > 80
                  ? 'bg-orange-500'
                  : ''
              }`}
              style={{ width: `${Math.min(safeTotalBudget.percentage, 100)}%` }}
            ></div>
          </div>
          <div className={`progress-label ${safeTotalBudget.percentage > 100 ? 'text-red-500' : ''}`}>
            {safeTotalBudget.percentage.toFixed(1)}%
          </div>
        </div>

        {safeTotalBudget.rolloverAmount !== undefined && safeTotalBudget.rolloverAmount !== 0 && (
          <div className="rollover-info">
            <span>本月结转: </span>
            <span className={`rollover-amount ${
              safeTotalBudget.rolloverAmount > 0
                ? 'positive'
                : safeTotalBudget.rolloverAmount < 0
                ? 'negative'
                : ''
            }`}>
              {safeTotalBudget.rolloverAmount > 0 ? '+' : ''}
              {formatCurrency(safeTotalBudget.rolloverAmount)}
            </span>
            <i className="fas fa-info-circle rollover-info-icon"></i>
          </div>
        )}

        <div className="daily-budget">
          <span>日均可用: </span>
          <span className="daily-amount">
            {formatCurrency(safeTotalBudget.dailyAvailable)}
          </span>
        </div>
      </div>
    </div>
  );
}
