"use client";

import { useRouter } from "next/navigation";
import { CategoryType } from "@/store/category-list-store";

interface AddCategoryButtonProps {
  type: CategoryType;
}

export function AddCategoryButton({ type }: AddCategoryButtonProps) {
  const router = useRouter();

  // 处理添加分类
  const handleAddCategory = () => {
    router.push(`/settings/categories/new?type=${type}`);
  };

  return (
    <button className="add-category-button" onClick={handleAddCategory}>
      <i className="fas fa-plus"></i>
      <span>添加分类</span>
    </button>
  );
}
