"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { CategoryForm } from "@/components/categories/category-form";
import { useCategoryFormStore } from "@/store/category-form-store";
import { useAuthStore } from "@/store/auth-store";
import "../categories.css";
import "./category-form.css";

export default function NewCategoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { setMode, setType, resetForm } = useCategoryFormStore();

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // 设置表单模式和初始类型
  useEffect(() => {
    setMode("create");
    
    // 从URL参数中获取类型
    const typeParam = searchParams.get("type");
    if (typeParam && (typeParam === "EXPENSE" || typeParam === "INCOME")) {
      setType(typeParam);
    }
    
    // 重置表单
    resetForm();
  }, [setMode, setType, resetForm, searchParams]);

  return (
    <PageContainer
      title="添加分类"
      showBackButton={true}
      activeNavItem="profile"
    >
      <div className="category-form-container">
        <h2 className="form-title">创建新分类</h2>
        <p className="form-description">
          创建一个新的交易分类，用于更好地组织和分析您的财务数据。
        </p>
        
        <CategoryForm />
      </div>
    </PageContainer>
  );
}
