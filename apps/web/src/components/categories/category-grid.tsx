"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Category } from "@/types";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { getIconClass } from "@/lib/utils";

interface CategoryGridProps {
  categories: Category[];
  isLoading: boolean;
  isShowingHidden?: boolean;
}

export function CategoryGrid({ categories, isLoading, isShowingHidden = false }: CategoryGridProps) {
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
              style={category.color ? { backgroundColor: category.color } : {}}
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
          isShowingHidden={isShowingHidden}
        />
      )}
    </>
  );
}
