'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './categories.css';
import { PageContainer } from '@/components/layout/page-container';
import { CategoryGrid } from '@/components/categories/category-grid';
import { CategoryList } from '@/components/categories/category-list';
import { AddCategoryButton } from '@/components/categories/add-category-button';
import CategoryEditModal from '@/components/category-edit-modal';
import { useCategoryStore } from '@/store/category-store';
import { toast } from 'sonner';
import { Category, TransactionType } from '@/types';

export default function CategoryListPage() {
  const router = useRouter();
  const { categories, isLoading, fetchCategories, updateCategoryOrder } = useCategoryStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedType, setSelectedType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [isSorting, setIsSorting] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  // 分类编辑模态框状态
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // 获取分类列表
  useEffect(() => {
    fetchCategories(undefined, undefined, showHidden);
  }, [fetchCategories, showHidden]);

  // 从本地存储中获取视图模式
  useEffect(() => {
    try {
      const savedViewMode = localStorage.getItem('categoryViewMode');
      if (savedViewMode && (savedViewMode === 'grid' || savedViewMode === 'list')) {
        setViewMode(savedViewMode as 'grid' | 'list');
      }
    } catch (error) {
      console.error('获取视图模式失败:', error);
    }
  }, []);

  // 切换视图模式
  const toggleViewMode = () => {
    const newMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(newMode);
    try {
      localStorage.setItem('categoryViewMode', newMode);
    } catch (error) {
      console.error('保存视图模式失败:', error);
    }
  };

  // 处理分类排序
  const handleUpdateOrder = async (categoryIds: string[]) => {
    setIsSorting(true);
    try {
      await updateCategoryOrder(categoryIds);
      toast.success('分类排序已保存');
    } catch (error) {
      console.error('更新分类排序失败:', error);
      toast.error('保存排序失败');
    } finally {
      setIsSorting(false);
    }
  };

  // 处理分类编辑
  const handleEditCategory = (categoryId: string) => {
    setEditingCategoryId(categoryId);
  };

  // 关闭编辑模态框
  const handleCloseEditModal = () => {
    setEditingCategoryId(null);
  };

  // 保存分类编辑
  const handleSaveCategory = () => {
    setEditingCategoryId(null);
    // 重新获取分类列表
    fetchCategories(undefined, undefined, showHidden);
  };

  // 过滤当前类型的分类
  const filteredCategories = categories.filter((category) => {
    const typeMatch = category.type === selectedType;
    const hiddenMatch = showHidden ? category.isHidden : !category.isHidden;
    return typeMatch && hiddenMatch;
  });

  // 右侧操作按钮
  const rightActions = (
    <div className="flex gap-2">
      <button
        className={`icon-button ${showHidden ? 'active' : ''}`}
        onClick={() => setShowHidden(!showHidden)}
        title={showHidden ? '显示可见分类' : '显示隐藏分类'}
      >
        <i className={`fas fa-eye${showHidden ? '' : '-slash'}`}></i>
      </button>
      <button className="icon-button" onClick={toggleViewMode}>
        <i className={`fas fa-${viewMode === 'grid' ? 'list' : 'th'}`}></i>
      </button>
    </div>
  );

  return (
    <PageContainer
      title={`分类管理${showHidden ? ' - 隐藏分类' : ''}`}
      rightActions={rightActions}
      showBackButton={true}
      activeNavItem="profile"
    >
      {/* 类型切换 */}
      <div className="category-type-toggle">
        <button
          className={`type-button ${selectedType === TransactionType.EXPENSE ? 'active' : ''}`}
          onClick={() => setSelectedType(TransactionType.EXPENSE)}
        >
          {showHidden ? '隐藏的支出分类' : '支出分类'}
        </button>
        <button
          className={`type-button ${selectedType === TransactionType.INCOME ? 'active' : ''}`}
          onClick={() => setSelectedType(TransactionType.INCOME)}
        >
          {showHidden ? '隐藏的收入分类' : '收入分类'}
        </button>
      </div>

      {/* 分类列表 */}
      {viewMode === 'grid' ? (
        <CategoryGrid
          categories={filteredCategories}
          isLoading={isLoading}
          isShowingHidden={showHidden}
          onEditCategory={handleEditCategory}
        />
      ) : (
        <CategoryList
          categories={filteredCategories}
          isLoading={isLoading}
          onUpdateOrder={handleUpdateOrder}
          isSorting={isSorting}
          isShowingHidden={showHidden}
          onEditCategory={handleEditCategory}
        />
      )}

      {/* 添加分类按钮 */}
      <AddCategoryButton type={selectedType} />

      {/* 分类编辑模态框 */}
      {editingCategoryId && (
        <CategoryEditModal
          categoryId={editingCategoryId}
          onClose={handleCloseEditModal}
          onSave={handleSaveCategory}
        />
      )}
    </PageContainer>
  );
}
