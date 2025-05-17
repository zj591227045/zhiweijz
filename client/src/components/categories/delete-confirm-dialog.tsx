"use client";

import { Category, useCategoryListStore } from "@/store/category-list-store";

interface DeleteConfirmDialogProps {
  category: Category;
  onClose: () => void;
}

export function DeleteConfirmDialog({ category, onClose }: DeleteConfirmDialogProps) {
  const deleteCategory = useCategoryListStore(state => state.deleteCategory);
  const isDeleting = useCategoryListStore(state => state.isDeleting);

  // 处理删除
  const handleDelete = async () => {
    const success = await deleteCategory(category.id);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-container">
        <div className="dialog-header">
          <h3>删除分类</h3>
          <button className="close-button" onClick={onClose} disabled={isDeleting}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="dialog-content">
          <p>确定要删除分类 "{category.name}" 吗？</p>
          <p className="warning-text">
            <i className="fas fa-exclamation-triangle"></i>
            此操作不可撤销，使用此分类的交易记录将变为未分类。
          </p>
        </div>
        <div className="dialog-actions">
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={isDeleting}
          >
            取消
          </button>
          <button 
            className="delete-button" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> 删除中...
              </>
            ) : (
              '确认删除'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
