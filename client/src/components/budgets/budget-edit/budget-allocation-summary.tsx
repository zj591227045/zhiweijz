'use client';

import { useBudgetEditStore } from '@/store/budget-edit-store';

export function BudgetAllocationSummary() {
  const { amount, categoryBudgets, categoryBudgetAmount } = useBudgetEditStore();

  // 计算已分配金额（排除"其他"分类）
  const allocatedAmount = categoryBudgets
    .filter(budget => !budget.isOther)
    .reduce((sum, budget) => sum + budget.amount, 0);

  // 计算当前选中的分类预算金额（如果有）
  const currentAmount = categoryBudgetAmount || 0;

  // 计算剩余可分配金额
  const remainingAmount = amount - allocatedAmount;

  // 检查当前输入的金额是否超过剩余可分配金额
  const isOverBudget = currentAmount > remainingAmount;

  return (
    <div className="category-budget-info">
      <div className="info-item">
        <span className="info-label">总预算:</span>
        <span className="info-value">¥{amount.toFixed(2)}</span>
      </div>
      <div className="info-item">
        <span className="info-label">已分配:</span>
        <span className="info-value">¥{allocatedAmount.toFixed(2)}</span>
      </div>
      <div className="info-item">
        <span className="info-label">剩余可分配:</span>
        <span className={`info-value ${isOverBudget ? 'text-red-500' : ''}`}>
          ¥{remainingAmount.toFixed(2)}
        </span>
      </div>
      {isOverBudget && (
        <div className="text-red-500 text-sm mt-2">
          <i className="fa fa-exclamation-circle mr-1"></i>
          当前输入金额超过剩余可分配金额
        </div>
      )}
    </div>
  );
}
