"use client";

import { useTransactionFormStore } from "@/store/transaction-form-store";
import { getIconClass } from "@/lib/utils";

interface CategorySelectorProps {
  categories: any[];
  isLoading: boolean;
}

export function CategorySelector({ categories, isLoading }: CategorySelectorProps) {
  const { categoryId, goToStep, setCategory } = useTransactionFormStore();

  // 处理分类选择
  const handleCategorySelect = (category: any) => {
    setCategory(
      category.id,
      category.name,
      category.icon || null
    );

    // 自动进入下一步
    setTimeout(() => {
      goToStep(2);
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="step-content">
        <h3 className="step-title">选择分类</h3>
        <div className="category-section">
          <div className="text-center py-8">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="step-content">
      <h3 className="step-title">选择分类</h3>
      <div className="category-section">
        <div className="category-grid">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`category-item ${categoryId === category.id ? 'active' : ''}`}
              onClick={() => handleCategorySelect(category)}
            >
              <div className="category-icon-wrapper">
                <i className={getIconClass(category.icon || "")}></i>
              </div>
              <span className="category-name">{category.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
