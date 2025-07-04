'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Category } from '@/types';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { getIconClass } from '@/lib/utils';

interface CategoryListProps {
  categories: Category[];
  isLoading: boolean;
  onUpdateOrder?: (categoryIds: string[]) => Promise<void>;
  isSorting?: boolean;
  isShowingHidden?: boolean;
  onEditCategory?: (categoryId: string) => void;
}

export function CategoryList({
  categories,
  isLoading,
  onUpdateOrder,
  isSorting,
  isShowingHidden = false,
  onEditCategory,
}: CategoryListProps) {
  const router = useRouter();
  const [draggedItem, setDraggedItem] = useState<Category | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const draggedOverItem = useRef<Category | null>(null);

  // 处理拖拽开始
  const handleDragStart = (e: React.DragEvent, category: Category) => {
    setDraggedItem(category);
    e.dataTransfer.effectAllowed = 'move';
    // 设置拖拽图像
    const dragImage = document.createElement('div');
    dragImage.classList.add('drag-image');
    dragImage.textContent = category.name;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };

  // 处理拖拽结束
  const handleDragEnd = async () => {
    if (!draggedItem || !draggedOverItem.current || !onUpdateOrder) {
      setDraggedItem(null);
      return;
    }

    // 创建新的排序数组
    const reorderedCategories = [...categories];
    const draggedItemIndex = reorderedCategories.findIndex((item) => item.id === draggedItem.id);
    const draggedOverItemIndex = reorderedCategories.findIndex(
      (item) => item.id === draggedOverItem.current?.id,
    );

    // 移除拖拽项并插入到新位置
    const [removed] = reorderedCategories.splice(draggedItemIndex, 1);
    reorderedCategories.splice(draggedOverItemIndex, 0, removed);

    // 提取ID数组
    const categoryIds = reorderedCategories.map((item) => item.id);

    // 更新排序
    await onUpdateOrder(categoryIds);

    // 重置状态
    setDraggedItem(null);
    draggedOverItem.current = null;
  };

  // 处理拖拽悬停
  const handleDragOver = (e: React.DragEvent, category: Category) => {
    e.preventDefault();
    draggedOverItem.current = category;
  };

  // 处理编辑
  const handleEdit = (category: Category) => {
    if (onEditCategory) {
      onEditCategory(category.id);
    } else {
      // 兼容旧的路由跳转方式
      router.push(`/settings/categories/${category.id}/edit`);
    }
  };

  // 处理删除
  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteDialog(true);
  };

  if (isLoading) {
    return (
      <div className="category-list">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="category-list-item skeleton"></div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="category-list">
        {categories.map((category) => (
          <div
            key={category.id}
            className={`category-list-item ${category.isDefault ? 'default' : 'custom'} ${
              draggedItem?.id === category.id ? 'dragging' : ''
            }`}
            draggable
            onDragStart={(e) => handleDragStart(e, category)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, category)}
          >
            {/* 拖动手柄 */}
            <div className="drag-handle">
              <i className="fas fa-grip-lines"></i>
            </div>

            {/* 分类图标 */}
            <div
              className="category-icon"
              style={category.color ? { backgroundColor: category.color } : {}}
            >
              <i className={getIconClass(category.icon)}></i>
            </div>

            {/* 分类名称 */}
            <div className="category-name">{category.name}</div>

            {/* 操作按钮 */}
            <div className="category-actions">
              <button
                className="action-button edit"
                onClick={() => handleEdit(category)}
                aria-label="编辑分类"
              >
                <i className="fas fa-edit"></i>
              </button>

              {!category.isDefault && (
                <button
                  className="action-button delete"
                  onClick={() => handleDelete(category)}
                  aria-label="删除分类"
                >
                  <i className="fas fa-trash"></i>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 删除确认对话框 */}
      {showDeleteDialog && selectedCategory && (
        <DeleteConfirmDialog
          category={selectedCategory}
          onClose={() => setShowDeleteDialog(false)}
          isShowingHidden={isShowingHidden}
        />
      )}

      {/* 排序中提示 */}
      {isSorting && (
        <div className="sorting-overlay">
          <div className="sorting-indicator">
            <i className="fas fa-spinner fa-spin"></i>
            <span>正在保存排序...</span>
          </div>
        </div>
      )}
    </>
  );
}
