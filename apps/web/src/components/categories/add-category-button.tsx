'use client';

import { useRouter } from 'next/navigation';
import { TransactionType } from '@/types';
import { haptic } from '@/utils/haptic-feedback';

interface AddCategoryButtonProps {
  type: TransactionType;
}

export function AddCategoryButton({ type }: AddCategoryButtonProps) {
  const router = useRouter();

  // 处理添加分类
  const handleAddCategory = () => {
    haptic.light(); // 轻微震动反馈
    router.push(`/settings/categories/new?type=${type}`);
  };

  return (
    <button className="add-category-button" onClick={handleAddCategory}>
      <i className="fas fa-plus"></i>
      <span>添加分类</span>
    </button>
  );
}
