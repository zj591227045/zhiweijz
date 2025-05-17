'use client';

import { Budget } from '@/store/budget-store';
import { formatCurrency, getCategoryIconClass } from '@/lib/utils';

interface BudgetCardProps {
  budget: Budget;
  onClick?: () => void;
}

export function BudgetCard({ budget, onClick }: BudgetCardProps) {
  // 添加调试日志
  console.log('BudgetCard 组件渲染 - 预算数据:', budget);

  // 使用工具函数获取图标类名
  const getIconClass = getCategoryIconClass;

  // 根据进度确定颜色
  const getProgressColor = (percentage: number) => {
    if (percentage > 100) return 'bg-red-500';
    if (percentage > 80) return 'bg-orange-500';
    if (percentage > 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // 根据是否超支确定文本颜色
  const getTextColorClass = (isOverspent: boolean) => {
    return isOverspent ? 'text-red-500' : '';
  };

  // 确保所有必要的属性都存在，避免渲染错误
  const safePercentage = budget.percentage || 0;
  const safeAmount = budget.amount || 0;
  const safeSpent = budget.spent || 0;
  const safeRolloverAmount = budget.rolloverAmount || 0;
  const safeCategoryName = budget.categoryName || budget.name || '未命名预算';
  const safeCategoryIcon = budget.categoryIcon || 'fa-money-bill';
  const safeIsOverspent = budget.isOverspent || false;
  const safeRollover = budget.rollover || false;

  return (
    <div
      className={`budget-item ${safeIsOverspent ? 'warning' : ''}`}
      onClick={onClick}
    >
      <div className="budget-category">
        <div className="category-icon">
          <i className={`fas ${getIconClass(safeCategoryIcon)}`}></i>
        </div>
        <span>{safeCategoryName}</span>
      </div>

      <div className="budget-details">
        <div className={`budget-amounts ${getTextColorClass(safeIsOverspent)}`}>
          <span className="spent">{formatCurrency(safeSpent)}</span>
          <span className="separator">/</span>
          <span className="total">{formatCurrency(safeAmount)}</span>
        </div>

        <div className="budget-progress">
          <div className={`progress-bar ${safeIsOverspent ? 'border-red-500' : ''}`}>
            <div
              className={`progress ${getProgressColor(safePercentage)}`}
              style={{ width: `${Math.min(safePercentage, 100)}%` }}
            ></div>
          </div>
          <div className={`progress-percentage ${getTextColorClass(safeIsOverspent)}`}>
            {safePercentage.toFixed(1)}%
          </div>
        </div>

        {safeRollover && safeRolloverAmount !== 0 && (
          <div className={`rollover-badge ${safeRolloverAmount > 0 ? 'positive' : 'negative'}`}>
            <i className="fas fa-exchange-alt"></i>
            <span>
              {safeRolloverAmount > 0 ? '+' : ''}
              {formatCurrency(safeRolloverAmount)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
