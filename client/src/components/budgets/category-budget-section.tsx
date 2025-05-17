"use client";

import { useBudgetFormStore } from "@/store/budget-form-store";

export function CategoryBudgetSection() {
  const {
    enableCategoryBudget,
    toggleCategoryBudget,
    categories,
    selectedCategoryId,
    setSelectedCategory,
    categoryBudgetAmount,
    setCategoryBudgetAmount,
    addCategoryBudget,
    removeCategoryBudget,
    categoryBudgets,
    formData,
  } = useBudgetFormStore();

  // 处理分类选择
  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
  };

  // 处理分类预算金额变更
  const handleCategoryBudgetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // 只允许输入数字和小数点
    if (/^$|^[0-9]+\.?[0-9]*$/.test(value)) {
      setCategoryBudgetAmount(value ? parseFloat(value) : 0);
    }
  };

  // 计算预算分配情况
  const totalBudget = formData.amount;
  const allocatedBudget = categoryBudgets.reduce((sum, cb) => sum + cb.amount, 0);
  const remainingBudget = totalBudget - allocatedBudget;

  // 获取选中的分类
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="form-section">
      <div className="section-header">
        <div className="section-title">分类预算</div>
        <div className="toggle-container">
          <span>启用分类预算</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={enableCategoryBudget}
              onChange={toggleCategoryBudget}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      {enableCategoryBudget && (
        <div className="category-budget-container">
          <div className="category-selector">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`category-option ${selectedCategoryId === category.id ? "active" : ""}`}
                onClick={() => handleCategorySelect(category.id)}
              >
                <div
                  className="category-icon"
                  style={{ backgroundColor: category.color }}
                >
                  <i className={`fas fa-${category.icon}`}></i>
                </div>
                <span>{category.name}</span>
              </div>
            ))}
          </div>
          
          {selectedCategory && (
            <div className="category-budget-form">
              <div className="selected-category">
                <div
                  className="category-icon"
                  style={{ backgroundColor: selectedCategory.color }}
                >
                  <i className={`fas fa-${selectedCategory.icon}`}></i>
                </div>
                <span>{selectedCategory.name}</span>
              </div>
              
              <div className="form-group">
                <label htmlFor="category-budget-amount">分类预算金额</label>
                <div className="amount-input">
                  <span className="currency-symbol">¥</span>
                  <input
                    type="text"
                    id="category-budget-amount"
                    placeholder="0.00"
                    value={categoryBudgetAmount || ""}
                    onChange={handleCategoryBudgetAmountChange}
                  />
                </div>
              </div>
              
              <div className="category-budget-info">
                <div className="info-item">
                  <span className="info-label">总预算:</span>
                  <span className="info-value">¥{totalBudget.toLocaleString()}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">已分配:</span>
                  <span className="info-value">¥{allocatedBudget.toLocaleString()}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">剩余可分配:</span>
                  <span className="info-value">¥{remainingBudget.toLocaleString()}</span>
                </div>
              </div>
              
              <button
                type="button"
                className="add-category-budget-button"
                onClick={addCategoryBudget}
                disabled={!categoryBudgetAmount || categoryBudgetAmount <= 0 || categoryBudgetAmount > remainingBudget}
              >
                添加分类预算
              </button>
            </div>
          )}
          
          {categoryBudgets.length > 0 && (
            <div className="category-budget-list">
              {categoryBudgets.map((budget) => (
                <div key={budget.categoryId} className="category-budget-item">
                  <div className="category-info">
                    <div
                      className="category-icon small"
                      style={{ backgroundColor: budget.categoryColor }}
                    >
                      <i className={`fas fa-${budget.categoryIcon}`}></i>
                    </div>
                    <span>{budget.categoryName}</span>
                  </div>
                  <div className="category-budget-amount">¥{budget.amount.toLocaleString()}</div>
                  <button
                    type="button"
                    className="remove-button"
                    onClick={() => removeCategoryBudget(budget.categoryId)}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
