"use client";

import { Category } from "@/types";
import { useTransactionEditStore } from "@/store/transaction-edit-store";
import { cn } from "@/lib/utils";

interface CategorySelectorProps {
  categories: Category[];
  isLoading: boolean;
}

export function CategorySelector({ categories, isLoading }: CategorySelectorProps) {
  const { categoryId, goToStep } = useTransactionEditStore();

  // 获取图标类名
  const getIconClass = (iconName: string | undefined) => {
    if (!iconName) return "fas fa-question";
    
    // 如果图标名称已经包含完整的类名，则直接返回
    if (iconName.startsWith("fa-")) {
      return `fas ${iconName}`;
    }
    
    // 根据图标名称映射到Font Awesome图标
    const iconMap: Record<string, string> = {
      restaurant: "fa-utensils",
      shopping: "fa-shopping-bag",
      transport: "fa-bus",
      home: "fa-home",
      clothing: "fa-tshirt",
      entertainment: "fa-gamepad",
      medical: "fa-heartbeat",
      education: "fa-graduation-cap",
      gift: "fa-gift",
      travel: "fa-plane",
      communication: "fa-mobile-alt",
      // 添加更多图标映射...
    };
    
    return `fas ${iconMap[iconName] || "fa-question"}`;
  };

  // 处理分类选择
  const handleCategorySelect = (category: Category) => {
    useTransactionEditStore.getState().setCategory(
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
            <div
              key={category.id}
              className={cn("category-item", category.id === categoryId && "active")}
              onClick={() => handleCategorySelect(category)}
            >
              <div className="category-icon-wrapper">
                <i className={getIconClass(category.icon)}></i>
              </div>
              <span>{category.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
