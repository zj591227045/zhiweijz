"use client";

import { useState } from "react";
import { Category } from "@/types";
import { useCategoryStore } from "@/store/category-store";
import { toast } from "sonner";

interface DeleteConfirmDialogProps {
  category: Category;
  onClose: () => void;
}

export function DeleteConfirmDialog({ category, onClose }: DeleteConfirmDialogProps) {
  const { deleteCategory } = useCategoryStore();
  const [isDeleting, setIsDeleting] = useState(false);

  // 处理删除
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const success = await deleteCategory(category.id);
      if (success) {
        toast.success('分类删除成功');
        onClose();
      }
    } catch (error) {
      console.error('删除分类失败:', error);
      toast.error('删除分类失败');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3 className="dialog-title">删除分类</h3>
          <button 
            className="dialog-close" 
            onClick={onClose} 
            disabled={isDeleting}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="dialog-body">
          <p>确定要删除分类 "{category.name}" 吗？</p>
          <p className="warning-text">
            <i className="fas fa-exclamation-triangle"></i>
            此操作不可撤销，使用此分类的交易记录将变为未分类。
          </p>
        </div>
        <div className="dialog-footer">
          <button 
            className="dialog-cancel" 
            onClick={onClose}
            disabled={isDeleting}
          >
            取消
          </button>
          <button 
            className="dialog-confirm danger" 
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