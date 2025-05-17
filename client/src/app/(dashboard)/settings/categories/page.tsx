"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { CategoryTypeToggle } from "@/components/categories/category-type-toggle";
import { CategoryGrid } from "@/components/categories/category-grid";
import { CategoryList } from "@/components/categories/category-list";
import { AddCategoryButton } from "@/components/categories/add-category-button";
import { useCategoryListStore } from "@/store/category-list-store";
import { useAuthStore } from "@/store/auth-store";
import "./categories.css";

export default function CategoryListPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    viewMode,
    selectedType,
    categories,
    isLoading,
    fetchCategories
  } = useCategoryListStore();

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // 获取分类列表
  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
    }
  }, [isAuthenticated, fetchCategories]);

  // 从本地存储中获取视图模式
  useEffect(() => {
    try {
      const savedViewMode = localStorage.getItem('categoryViewMode');
      if (savedViewMode && (savedViewMode === 'grid' || savedViewMode === 'list')) {
        useCategoryListStore.getState().setViewMode(savedViewMode);
      }
    } catch (error) {
      console.error('获取视图模式失败:', error);
    }
  }, []);

  // 切换视图模式
  const toggleViewMode = () => {
    const newMode = viewMode === 'grid' ? 'list' : 'grid';
    useCategoryListStore.getState().setViewMode(newMode);
  };

  // 右侧操作按钮
  const rightActions = (
    <button className="icon-button" onClick={toggleViewMode}>
      <i className={`fas fa-${viewMode === 'grid' ? 'list' : 'th'}`}></i>
    </button>
  );

  return (
    <PageContainer
      title="分类管理"
      rightActions={rightActions}
      showBackButton={true}
      activeNavItem="profile"
    >
      {/* 类型切换 */}
      <CategoryTypeToggle selectedType={selectedType} />

      {/* 分类列表 */}
      {viewMode === 'grid' ? (
        <CategoryGrid
          categories={categories}
          isLoading={isLoading}
        />
      ) : (
        <CategoryList
          categories={categories}
          isLoading={isLoading}
        />
      )}

      {/* 添加分类按钮 */}
      <AddCategoryButton type={selectedType} />
    </PageContainer>
  );
}
