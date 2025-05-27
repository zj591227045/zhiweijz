'use client';

import { getCategoryIconClass } from '@/lib/utils';

interface CategoryBudget {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverspent: boolean;
}

interface CategoryBudgetListProps {
  categoryBudgets: CategoryBudget[];
  filter: 'all' | 'overspent';
  onFilterChange: (filter: 'all' | 'overspent') => void;
  enableCategoryBudget: boolean;
}

export function CategoryBudgetList({
  categoryBudgets,
  filter,
  onFilterChange,
  enableCategoryBudget
}: CategoryBudgetListProps) {
  // 根据筛选条件过滤分类预算
  const filteredBudgets = filter === 'all'
    ? categoryBudgets
    : categoryBudgets.filter(budget => budget.isOverspent);

  // 格式化金额
  const formatAmount = (amount: number) => {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <section className="category-budgets">
      <div className="section-header">
        <h2>分类预算</h2>
        <div className="view-options">
          <button
            className={`view-option ${filter === 'all' ? 'active' : ''}`}
            onClick={() => onFilterChange('all')}
          >
            全部
          </button>
          <button
            className={`view-option ${filter === 'overspent' ? 'active' : ''}`}
            onClick={() => onFilterChange('overspent')}
          >
            超支
          </button>
        </div>
      </div>

      <div className="budget-list">
        {!enableCategoryBudget ? (
          <div className="empty-message">
            <p>分类预算未启用</p>
          </div>
        ) : filteredBudgets.length > 0 ? (
          filteredBudgets.map(budget => (
            <div
              key={budget.id}
              className={`budget-item ${budget.isOverspent ? 'warning' : ''}`}
            >
              <div className="budget-category">
                <i className={`fas ${getCategoryIconClass(budget.categoryIcon)} category-icon`}></i>
                <span>{budget.categoryName}</span>
              </div>
              <div className="budget-details">
                <div className="budget-progress">
                  <div className="progress-bar">
                    <div
                      className="progress"
                      style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="progress-percentage">{budget.percentage.toFixed(0)}%</div>
                </div>
                <div className="budget-amounts">
                  <span className="spent">¥{formatAmount(budget.spent)}</span>
                  <span className="separator">/</span>
                  <span className="total">¥{formatAmount(budget.amount)}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-message">
            <p>暂无{filter === 'overspent' ? '超支' : ''}分类预算</p>
          </div>
        )}
      </div>
    </section>
  );
}
