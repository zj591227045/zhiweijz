'use client';

import { useBudgetEditStore } from '@/store/budget-edit-store';

export function CategoryBudgetList() {
  const { categoryBudgets, removeCategoryBudget } = useBudgetEditStore();

  // 如果没有分类预算，显示提示信息
  if (categoryBudgets.length === 0) {
    return (
      <div className="empty-categories-container">
        <div className="text-center py-4 text-gray-500">
          <i className="fas fa-info-circle mr-2"></i>
          暂无分类预算，请添加
        </div>
      </div>
    );
  }

  return (
    <div className="category-budget-list">
      {categoryBudgets.map(budget => (
        <div key={budget.categoryId} className="category-budget-item">
          <div className="category-info">
            <div
              className="category-icon small"
              style={{ backgroundColor: budget.categoryIcon ? '#3B82F6' : '#9CA3AF' }}
            >
              <i className={budget.categoryIcon ? `fas ${budget.categoryIcon}` : 'fas fa-question'}></i>
            </div>
            <span>{budget.categoryName}</span>
          </div>
          <div className="category-budget-amount">
            ¥{budget.amount.toFixed(2)}
          </div>
          {!budget.isOther && (
            <button
              type="button"
              className="remove-button"
              onClick={() => removeCategoryBudget(budget.categoryId)}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
