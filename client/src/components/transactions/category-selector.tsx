"use client";

import { useTransactionFormStore } from "@/store/transaction-form-store";
import { Category } from "@/types";
import { CategoryItem } from "./category-item";

interface CategorySelectorProps {
  categories: Category[];
  isLoading: boolean;
}

export function CategorySelector({ categories, isLoading }: CategorySelectorProps) {
  const { type, categoryId, goToStep } = useTransactionFormStore();

  // 处理分类选择
  const handleCategorySelect = (category: Category) => {
    useTransactionFormStore.getState().setCategory(
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
    <div className="step-content" id="step-category">
      <h3 className="step-title">选择分类</h3>
      <div className="category-section">
        <div className="category-grid">
          {categories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              isActive={category.id === categoryId}
              onClick={() => handleCategorySelect(category)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
