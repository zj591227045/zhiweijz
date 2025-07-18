'use client';

import { useState } from 'react';
import { Category } from '@/types';
import { useCategoryStore } from '@/store/category-store';
import { toast } from 'sonner';

interface DeleteConfirmDialogProps {
  category: Category;
  onClose: () => void;
  isShowingHidden?: boolean;
}

export function DeleteConfirmDialog({
  category,
  onClose,
  isShowingHidden = false,
}: DeleteConfirmDialogProps) {
  const { deleteCategory, updateCategory } = useCategoryStore();
  const [isDeleting, setIsDeleting] = useState(false);

  // 处理删除、隐藏或显示
  const handleAction = async () => {
    setIsDeleting(true);
    try {
      let success = false;

      if (isShowingHidden && category.isHidden) {
        // 如果在查看隐藏分类，则显示分类
        success = await updateCategory(category.id, { isHidden: false });
        if (success) {
          toast.success('分类已显示');
        }
      } else if (category.isDefault) {
        // 默认分类只能隐藏
        success = await updateCategory(category.id, { isHidden: true });
        if (success) {
          toast.success('分类已隐藏');
        }
      } else {
        // 自定义分类可以删除
        success = await deleteCategory(category.id);
        if (success) {
          toast.success('分类删除成功');
        }
      }

      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('操作失败:', error);
      const errorMessage =
        isShowingHidden && category.isHidden
          ? '显示分类失败'
          : category.isDefault
            ? '隐藏分类失败'
            : '删除分类失败';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3 className="dialog-title">
            {isShowingHidden && category.isHidden
              ? '显示分类'
              : category.isDefault
                ? '隐藏分类'
                : '删除分类'}
          </h3>
          <button className="dialog-close" onClick={onClose} disabled={isDeleting}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="dialog-body">
          <p>
            {isShowingHidden && category.isHidden
              ? `确定要显示分类 "${category.name}" 吗？`
              : category.isDefault
                ? `确定要隐藏分类 "${category.name}" 吗？`
                : `确定要删除分类 "${category.name}" 吗？`}
          </p>
          <p className="warning-text">
            <i className="fas fa-exclamation-triangle"></i>
            {isShowingHidden && category.isHidden
              ? '显示后该分类将在添加记录时可选。'
              : category.isDefault
                ? '隐藏后该分类不会在添加记录时显示，但可以在分类管理中重新显示。'
                : '此操作不可撤销，使用此分类的记账记录将变为未分类。'}
          </p>
        </div>
        <div className="dialog-footer">
          <button className="dialog-cancel" onClick={onClose} disabled={isDeleting}>
            取消
          </button>
          <button
            className={`dialog-confirm ${
              isShowingHidden && category.isHidden
                ? 'primary'
                : category.isDefault
                  ? 'warning'
                  : 'danger'
            }`}
            onClick={handleAction}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                {isShowingHidden && category.isHidden
                  ? '显示中...'
                  : category.isDefault
                    ? '隐藏中...'
                    : '删除中...'}
              </>
            ) : isShowingHidden && category.isHidden ? (
              '确认显示'
            ) : category.isDefault ? (
              '确认隐藏'
            ) : (
              '确认删除'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
