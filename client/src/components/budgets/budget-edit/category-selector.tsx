'use client';

import { useBudgetEditStore } from '@/store/budget-edit-store';
import { cn } from '@/lib/utils';

interface CategorySelectorProps {
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string) => void;
}

export function CategorySelector({ selectedCategoryId, onCategorySelect }: CategorySelectorProps) {
  const { categories, categoryBudgets } = useBudgetEditStore();

  // 过滤掉已经添加到预算中的分类，并且排除"其他"分类预算
  const availableCategories = categories.filter(
    category => !categoryBudgets.some(cb => cb.categoryId === category.id && !cb.isOther)
  );

  // 如果没有可用分类，显示提示信息和添加新分类的按钮
  if (availableCategories.length === 0) {
    return (
      <div className="empty-categories-container">
        <div className="text-center py-4 text-gray-500">
          <i className="fas fa-info-circle mr-2"></i>
          所有分类已添加到预算中
        </div>
        <div className="category-budget-info">
          <div className="info-item">
            <span className="info-label">提示</span>
            <span className="info-value">您可以在分类管理中添加新的分类</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="category-selector">
      {availableCategories.map(category => (
        <div
          key={category.id}
          className={cn(
            "category-option",
            selectedCategoryId === category.id && "active"
          )}
          onClick={() => onCategorySelect(category.id)}
        >
          <div
            className="category-icon"
            style={{ backgroundColor: category.color || '#3B82F6' }}
          >
            <i className={category.icon ? `fas ${category.icon}` : 'fas fa-question'}></i>
          </div>
          <span>{category.name}</span>
        </div>
      ))}
    </div>
  );
}
