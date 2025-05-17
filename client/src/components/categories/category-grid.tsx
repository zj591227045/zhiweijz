"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Category } from "@/store/category-list-store";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";

interface CategoryGridProps {
  categories: Category[];
  isLoading: boolean;
}

export function CategoryGrid({ categories, isLoading }: CategoryGridProps) {
  const router = useRouter();
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // 处理长按开始
  const handleTouchStart = (category: Category, e: React.TouchEvent) => {
    e.preventDefault();
    const timer = setTimeout(() => {
      setSelectedCategory(category);
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
      setShowActionMenu(true);
    }, 500); // 500ms长按触发
    
    setLongPressTimer(timer);
  };

  // 处理触摸结束
  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // 处理点击
  const handleClick = (category: Category) => {
    // 如果是默认分类，只能编辑图标和颜色
    router.push(`/settings/categories/${category.id}/edit`);
  };

  // 处理编辑
  const handleEdit = () => {
    if (selectedCategory) {
      router.push(`/settings/categories/${selectedCategory.id}/edit`);
      setShowActionMenu(false);
    }
  };

  // 处理删除
  const handleDelete = () => {
    setShowActionMenu(false);
    setShowDeleteDialog(true);
  };

  // 获取图标类名
  const getIconClass = (iconName?: string) => {
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
      commission: "fa-hand-holding-usd",
      other: "fa-ellipsis-h",
    };
    
    return `fas ${iconMap[iconName] || "fa-question"}`;
  };

  if (isLoading) {
    return (
      <div className="category-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="category-grid-item skeleton"></div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="category-grid">
        {categories.map((category) => (
          <div
            key={category.id}
            className={`category-grid-item ${category.isDefault ? 'default' : 'custom'}`}
            onClick={() => handleClick(category)}
            onTouchStart={(e) => handleTouchStart(category, e)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
          >
            <div 
              className="category-icon" 
              style={{ backgroundColor: category.color || '#f0f0f0' }}
            >
              <i className={getIconClass(category.icon)}></i>
            </div>
            <div className="category-name">{category.name}</div>
          </div>
        ))}
      </div>

      {/* 操作菜单 */}
      {showActionMenu && selectedCategory && (
        <div 
          className="category-action-menu"
          style={{
            top: `${menuPosition.y}px`,
            left: `${menuPosition.x}px`,
          }}
        >
          <button className="action-button edit" onClick={handleEdit}>
            <i className="fas fa-edit"></i> 编辑
          </button>
          {!selectedCategory.isDefault && (
            <button className="action-button delete" onClick={handleDelete}>
              <i className="fas fa-trash"></i> 删除
            </button>
          )}
        </div>
      )}

      {/* 点击其他区域关闭菜单 */}
      {showActionMenu && (
        <div 
          className="overlay" 
          onClick={() => setShowActionMenu(false)}
        ></div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteDialog && selectedCategory && (
        <DeleteConfirmDialog
          category={selectedCategory}
          onClose={() => setShowDeleteDialog(false)}
        />
      )}
    </>
  );
}
