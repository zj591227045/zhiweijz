'use client';

import { useBudgetEditStore } from '@/store/budget-edit-store';
import { CategorySelector } from './category-selector';
import { CategoryBudgetList } from './category-budget-list';
import { BudgetAllocationSummary } from './budget-allocation-summary';
import { Switch } from '@/components/ui/switch';

export function CategoryBudgetSettings() {
  const {
    enableCategoryBudget,
    selectedCategoryId,
    categoryBudgetAmount,
    toggleCategoryBudget,
    setSelectedCategory,
    setCategoryBudgetAmount,
    addCategoryBudget
  } = useBudgetEditStore();

  // 处理分类预算开关变更
  const handleCategoryBudgetToggle = (checked: boolean) => {
    toggleCategoryBudget();
  };

  // 处理分类选择变更
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  // 处理分类预算金额变更
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setCategoryBudgetAmount(value);
    } else {
      setCategoryBudgetAmount(0);
    }
  };

  // 处理添加分类预算
  const handleAddCategoryBudget = () => {
    addCategoryBudget();
  };

  return (
    <>
      <div className="section-header">
        <div className="section-title">分类预算</div>
        <div className="toggle-container">
          <span>启用分类预算</span>
          <Switch
            id="enable-category-budget"
            checked={enableCategoryBudget}
            onCheckedChange={handleCategoryBudgetToggle}
          />
        </div>
      </div>

      {enableCategoryBudget && (
        <div className="category-budget-container">
          {/* 分类选择器 */}
          <CategorySelector
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={handleCategorySelect}
          />

          {/* 分类预算表单 */}
          {selectedCategoryId && (
            <div className="category-budget-form">
              <div className="form-group">
                <label htmlFor="category-budget-amount">分类预算金额</label>
                <div className="amount-input">
                  <span className="currency-symbol">¥</span>
                  <input
                    type="number"
                    id="category-budget-amount"
                    value={categoryBudgetAmount || ''}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>

              {/* 预算分配摘要 */}
              <BudgetAllocationSummary />

              <button
                type="button"
                className="add-category-budget-button"
                onClick={handleAddCategoryBudget}
                disabled={!selectedCategoryId || categoryBudgetAmount <= 0}
              >
                添加分类预算
              </button>
            </div>
          )}

          {/* 分类预算列表 */}
          <CategoryBudgetList />
        </div>
      )}
    </>
  );
}
