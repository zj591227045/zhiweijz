"use client";

import { useCategoryListStore, CategoryType } from "@/store/category-list-store";

interface CategoryTypeToggleProps {
  selectedType: CategoryType;
}

export function CategoryTypeToggle({ selectedType }: CategoryTypeToggleProps) {
  const setSelectedType = useCategoryListStore(state => state.setSelectedType);

  // 处理类型切换
  const handleTypeChange = (type: CategoryType) => {
    setSelectedType(type);
  };

  return (
    <div className="category-type-toggle">
      <button
        className={`type-button ${selectedType === 'EXPENSE' ? 'active' : ''}`}
        onClick={() => handleTypeChange('EXPENSE')}
      >
        支出
      </button>
      <button
        className={`type-button ${selectedType === 'INCOME' ? 'active' : ''}`}
        onClick={() => handleTypeChange('INCOME')}
      >
        收入
      </button>
    </div>
  );
}
