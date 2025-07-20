'use client';

import { useState } from 'react';
import { useTransactionFormStore } from '@/store/transaction-form-store';
import { useCategoryStore } from '@/store/category-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { getIconClass } from '@/lib/utils';
import { hapticPresets } from '@/lib/haptic-feedback';

interface CategorySelectorProps {
  categories: any[];
  isLoading: boolean;
}

export function CategorySelector({ categories, isLoading }: CategorySelectorProps) {
  const { categoryId, goToStep, setCategory, type } = useTransactionFormStore();
  const { fetchCategories } = useCategoryStore();
  const { currentAccountBook } = useAccountBookStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 处理分类选择
  const handleCategorySelect = (category: any) => {
    // 添加分类选择的振动反馈
    hapticPresets.categorySelect();

    setCategory(category.id, category.name, category.icon || null);

    // 自动进入下一步
    setTimeout(() => {
      goToStep(2);
    }, 300);
  };

  // 处理手动刷新
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      // 清除缓存并重新获取分类
      const { categoryCacheService } = await import('@/services/category-cache.service');
      const { useAuthStore } = await import('@/store/auth-store');
      const userId = useAuthStore.getState().user?.id;

      if (userId) {
        categoryCacheService.clearAllUserCache(userId);
        console.log('手动刷新：清除分类缓存');
      }

      // 重新获取分类数据
      if (currentAccountBook?.id) {
        await fetchCategories(type, currentAccountBook.id);
        console.log('手动刷新：重新获取分类数据');
      }
    } catch (error) {
      console.error('刷新分类失败:', error);
    } finally {
      setIsRefreshing(false);
    }
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="step-title mb-0">选择分类</h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className={`
            flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg
            transition-all duration-200
            ${
              isRefreshing || isLoading
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50 active:bg-blue-100'
            }
          `}
          title="刷新分类数据"
        >
          <i className={`fas fa-sync-alt ${isRefreshing ? 'fa-spin' : ''}`} />
          {isRefreshing ? '刷新中' : '刷新'}
        </button>
      </div>

      <div className="category-section">
        {categories.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <p>暂无分类数据</p>
            <button onClick={handleRefresh} className="mt-2 text-blue-600 hover:text-blue-700">
              点击刷新
            </button>
          </div>
        ) : (
          <div className="category-grid">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`category-item ${categoryId === category.id ? 'active' : ''}`}
                onClick={() => handleCategorySelect(category)}
              >
                <div className="category-icon-wrapper">
                  <i className={getIconClass(category.icon || '')}></i>
                </div>
                <span className="category-name">{category.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
