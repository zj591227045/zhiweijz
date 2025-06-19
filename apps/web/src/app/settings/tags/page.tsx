'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { TagManager } from '@/components/tags';
import { useAuthStore } from '@/store/auth-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { TagResponseDto } from '@/lib/api/types/tag.types';
import { toast } from 'sonner';

/**
 * 标签管理页面
 */
export default function TagsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { currentAccountBook } = useAccountBookStore();
  const [isLoading, setIsLoading] = useState(true);

  // 检查认证状态和账本
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }

    if (!currentAccountBook) {
      router.push('/books');
      return;
    }

    setIsLoading(false);
  }, [isAuthenticated, user, currentAccountBook, router]);

  // 处理标签创建成功
  const handleTagCreate = (tag: TagResponseDto) => {
    toast.success(`标签"${tag.name}"创建成功`);
  };

  // 处理标签更新成功
  const handleTagUpdate = (tag: TagResponseDto) => {
    toast.success(`标签"${tag.name}"更新成功`);
  };

  // 处理标签删除成功
  const handleTagDelete = (tagId: string) => {
    toast.success('标签删除成功');
  };

  // 如果正在加载或没有账本，显示加载状态
  if (isLoading || !currentAccountBook) {
    return (
      <PageContainer title="标签管理" showBackButton={true} activeNavItem="profile">
        <div className="flex h-40 items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="ml-3 text-gray-500">加载中...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="标签管理" showBackButton={true} activeNavItem="profile">
      <div className="tags-page-content">
        <TagManager
          accountBookId={currentAccountBook.id}
          onTagCreate={handleTagCreate}
          onTagUpdate={handleTagUpdate}
          onTagDelete={handleTagDelete}
          className="pb-20" // 为底部导航栏留出空间
        />
      </div>
    </PageContainer>
  );
}
