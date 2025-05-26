"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { CategoryForm } from "@/components/categories/category-form";
import { useCategoryFormStore } from "@/store/category-form-store";
import { useAuthStore } from "@/store/auth-store";
import "../../categories.css";
import "../../new/category-form.css";

interface EditCategoryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditCategoryPage({ params }: EditCategoryPageProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { 
    setMode, 
    setCategoryId, 
    fetchCategory, 
    originalCategory,
    isLoading 
  } = useCategoryFormStore();
  const [id, setId] = useState<string>("");

  // 解析异步params
  useEffect(() => {
    params.then((resolvedParams) => {
      setId(resolvedParams.id);
    });
  }, [params]);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // 设置表单模式和获取分类详情
  useEffect(() => {
    if (isAuthenticated && id) {
      setMode("edit");
      setCategoryId(id);
      fetchCategory(id);
    }
  }, [isAuthenticated, id, setMode, setCategoryId, fetchCategory]);

  return (
    <PageContainer
      title="编辑分类"
      showBackButton={true}
      activeNavItem="profile"
    >
      <div className="category-form-container">
        {isLoading ? (
          <div className="loading-indicator">
            <i className="fas fa-spinner fa-spin"></i>
            <span>加载中...</span>
          </div>
        ) : (
          <>
            <h2 className="form-title">
              {originalCategory?.isDefault ? "编辑默认分类" : "编辑分类"}
            </h2>
            <p className="form-description">
              {originalCategory?.isDefault
                ? "您可以修改默认分类的图标和颜色，但不能修改名称和类型。"
                : "修改分类的名称、图标和颜色，以更好地组织您的财务数据。"}
            </p>
            
            <CategoryForm id={id} />
          </>
        )}
      </div>
    </PageContainer>
  );
}
