'use client';

import { useBudgetAddStore } from '@/store/budget-add-store';

export function CategoryBudgetSettings() {
  const {
    enableCategoryBudget,
    categories,
    selectedCategoryId,
    categoryBudgetAmount,
    categoryBudgets,
    amount,
    errors,
    toggleCategoryBudget,
    setSelectedCategoryId,
    setCategoryBudgetAmount,
    addCategoryBudget,
    removeCategoryBudget
  } = useBudgetAddStore();

  // 调试输出，检查分类数据
  console.log('CategoryBudgetSettings 组件中的分类数据:', categories);

  // 如果分类数据为空，添加额外的调试信息
  if (!categories || categories.length === 0) {
    console.warn('分类数据为空，这可能是API请求尚未完成或失败');
  }

  // 处理分类预算开关切换
  const handleToggleCategoryBudget = () => {
    toggleCategoryBudget();
  };

  // 处理分类选择 - 直接在UI中使用setSelectedCategoryId

  // 处理分类预算金额变更
  const handleCategoryBudgetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setCategoryBudgetAmount(isNaN(value) ? 0 : value);
  };

  // 处理添加分类预算
  const handleAddCategoryBudget = () => {
    addCategoryBudget();
  };

  // 处理移除分类预算
  const handleRemoveCategoryBudget = (categoryId: string) => {
    removeCategoryBudget(categoryId);
  };

  // 计算已分配金额和剩余可分配金额
  const totalAllocated = categoryBudgets.reduce((sum, item) => sum + item.amount, 0);
  const remainingAllocatable = amount - totalAllocated;

  // 获取分类图标和颜色
  const getCategoryIconClass = (icon: string) => {
    // 调试输出，检查传入的图标值
    console.log('获取图标类名，传入的图标值:', icon);

    // 如果图标为空，使用默认图标
    if (!icon) {
      console.warn('图标值为空，使用默认图标');
      return 'fas fa-tag';
    }

    // 直接映射API返回的图标值到Font Awesome图标
    const iconMap: Record<string, string> = {
      // 基于API返回的图标值映射
      transport: "fa-bus",
      restaurant: "fa-utensils",
      shopping: "fa-shopping-bag",
      home: "fa-home",
      clothing: "fa-tshirt",
      entertainment: "fa-gamepad",
      medical: "fa-heartbeat",
      education: "fa-graduation-cap",
      gift: "fa-gift",
      travel: "fa-plane",
      communication: "fa-mobile-alt",
      daily: "fa-shopping-basket",
      sports: "fa-running",
      beauty: "fa-spa",
      child: "fa-baby",
      elder: "fa-user-friends",
      social: "fa-users",
      digital: "fa-laptop",
      car: "fa-car",
      repayment: "fa-hand-holding-usd",
      insurance: "fa-shield-alt",
      office: "fa-briefcase",
      repair: "fa-tools",
      interest: "fa-percentage",
      salary: "fa-money-bill-wave",
      "part-time": "fa-coins",
      investment: "fa-chart-line",
      bonus: "fa-gift",

      // 默认图标
      default: "fa-tag"
    };

    // 如果图标名称包含 "fa-"，则直接使用
    if (icon && icon.includes('fa-')) {
      return `fas ${icon}`;
    }

    const result = `fas ${iconMap[icon] || iconMap.default}`;
    console.log('映射后的图标类名:', result);
    return result;
  };

  return (
    <>
      <div className="section-title">分类预算</div>

      <div className="form-group">
        <div className="toggle-container">
          <span>启用分类预算</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={enableCategoryBudget}
              onChange={handleToggleCategoryBudget}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="help-text">
          <i className="fas fa-info-circle"></i>
          <span>启用后可以为不同分类设置预算金额</span>
        </div>
      </div>

      {enableCategoryBudget && (
        <div className="category-budget-form">
          <div className="form-group">
            <label>选择分类</label>
            <div className="category-grid-selector">
              {categories && categories.length > 0 ? (
                categories
                  .filter(category => {
                    // 调试输出，检查每个分类对象的结构
                    console.log('过滤前的分类对象:', category);
                    // 过滤掉已经添加了预算的分类
                    return !categoryBudgets.some(
                      (budget) => budget.categoryId === category.id
                    );
                  })
                  .map((category) => {
                    console.log('渲染分类项:', category);
                    return (
                      <div
                        key={category.id}
                        className={`category-item ${selectedCategoryId === category.id ? 'active' : ''}`}
                        onClick={() => setSelectedCategoryId(category.id)}
                      >
                        <div
                          className="category-icon-wrapper"
                          style={{ backgroundColor: category.color || '#FF5722' }}
                        >
                          <i className={getCategoryIconClass(category.icon)}></i>
                        </div>
                        <span>{category.name}</span>
                      </div>
                    );
                  })
              ) : (
                <div className="no-categories-message">
                  <i className="fas fa-info-circle"></i>
                  <span>
                    {categories && categories.length === 0
                      ? '没有可用的分类数据'
                      : '正在加载分类...'}
                  </span>
                </div>
              )}

              {categories.length > 0 &&
                categories.filter(c => !categoryBudgets.some(b => b.categoryId === c.id)).length === 0 && (
                <div className="no-categories-message">
                  <i className="fas fa-check-circle"></i>
                  <span>已添加所有可用分类</span>
                </div>
              )}
            </div>
            {errors.selectedCategoryId && (
              <div className="error-message">{errors.selectedCategoryId}</div>
            )}
          </div>

          {selectedCategoryId && (
            <>
              <div className="selected-category">
                {(() => {
                  const category = categories.find((c) => c.id === selectedCategoryId);
                  if (!category) return null;

                  return (
                    <>
                      <div
                        className="category-icon"
                        style={{ backgroundColor: category.color || '#FF5722' }}
                      >
                        <i className={getCategoryIconClass(category.icon)}></i>
                      </div>
                      <span>{category.name}</span>
                    </>
                  );
                })()}
              </div>

              <div className="form-group">
                <label htmlFor="category-budget-amount">分类预算金额</label>
                <div className="amount-input">
                  <span className="currency-symbol">¥</span>
                  <input
                    type="number"
                    id="category-budget-amount"
                    placeholder="0.00"
                    value={categoryBudgetAmount || ''}
                    onChange={handleCategoryBudgetAmountChange}
                    step="0.01"
                    min="0"
                    max={remainingAllocatable}
                  />
                </div>
                {errors.categoryBudgetAmount && (
                  <div className="error-message">{errors.categoryBudgetAmount}</div>
                )}
              </div>
            </>
          )}

          <div className="category-budget-info">
            <div className="info-item">
              <span className="info-label">总预算:</span>
              <span className="info-value">¥{amount.toFixed(2)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">已分配:</span>
              <span className="info-value">¥{totalAllocated.toFixed(2)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">剩余可分配:</span>
              <span className="info-value">¥{remainingAllocatable.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="button"
            className="add-category-budget-button"
            onClick={handleAddCategoryBudget}
            disabled={!selectedCategoryId || categoryBudgetAmount <= 0 || categoryBudgetAmount > remainingAllocatable}
          >
            添加分类预算
          </button>

          {errors.categoryBudgets && (
            <div className="error-message mt-2">{errors.categoryBudgets}</div>
          )}

          {categoryBudgets.length > 0 && (
            <div className="category-budget-list">
              {categoryBudgets.map((budget) => {
                const category = categories.find((c) => c.id === budget.categoryId);
                if (!category) return null;

                return (
                  <div key={budget.categoryId} className="category-budget-item">
                    <div className="category-info">
                      <div
                        className="category-icon small"
                        style={{ backgroundColor: category.color || '#FF5722' }}
                      >
                        <i className={getCategoryIconClass(category.icon)}></i>
                      </div>
                      <span>{category.name}</span>
                    </div>
                    <div className="category-budget-amount">¥{budget.amount.toFixed(2)}</div>
                    <button
                      className="remove-button"
                      type="button"
                      onClick={() => handleRemoveCategoryBudget(budget.categoryId)}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
