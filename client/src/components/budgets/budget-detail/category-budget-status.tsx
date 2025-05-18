'use client';

import { CategoryBudget } from '@/store/budget-detail-store';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/utils';

interface CategoryBudgetStatusProps {
  categoryBudgets: CategoryBudget[];
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function CategoryBudgetStatus({ categoryBudgets, enabled, onToggle }: CategoryBudgetStatusProps) {
  // 获取图标类名
  const getIconClass = (icon: string) => {
    return icon.startsWith('fa-') ? icon : `fa-${icon}`;
  };

  return (
    <div className="category-budget-status">
      <div className="section-header">
        <h2 className="section-title">分类预算状态</h2>
        <div className="category-budget-toggle">
          <span>启用分类预算</span>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-blue-500"
          />
        </div>
      </div>

      {enabled && categoryBudgets.length > 0 ? (
        <div className="space-y-4">
          {categoryBudgets.map((categoryBudget) => (
            <div key={categoryBudget.id} className="flex items-start space-x-3">
              <div className="category-icon">
                <i className={`fas ${getIconClass(categoryBudget.categoryIcon)}`}></i>
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <div className="font-medium">{categoryBudget.categoryName}</div>
                  <div className="text-sm font-medium">{formatCurrency(categoryBudget.amount)}</div>
                </div>
                <div className="progress-bar mb-1" style={{ height: '6px' }}>
                  <div
                    className={`progress-fill ${
                      isNaN(categoryBudget.percentage) ? 'normal' :
                      categoryBudget.percentage > 100
                        ? 'danger'
                        : categoryBudget.percentage > 80
                          ? 'warning'
                          : 'normal'
                    }`}
                    style={{ width: `${isNaN(categoryBudget.percentage) ? 0 : Math.min(categoryBudget.percentage, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>已用: {formatCurrency(categoryBudget.spent)}</span>
                  <span>{isNaN(categoryBudget.percentage) ? '0' : Math.round(categoryBudget.percentage)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : enabled ? (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          暂无分类预算数据
        </div>
      ) : null}
    </div>
  );
}
