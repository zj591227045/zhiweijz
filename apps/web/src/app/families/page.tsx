'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, BottomNavigation } from '@zhiweijz/web';
import { FamilyList } from '@/components/families/family-list';
import { CreateFamilyDialog } from '@/components/families/create-family-dialog';
import { JoinFamilyDialog } from '@/components/families/join-family-dialog';
import { EmptyState } from '@/components/families/empty-state';
import { useFamilyStore } from '@/store/family-store';
import './families.css';

export default function FamiliesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { families, isLoading, fetchFamilies } = useFamilyStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 初始化加载家庭列表
  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const handleCreateFamily = () => {
    setIsCreateDialogOpen(true);
  };

  const handleJoinFamily = () => {
    setIsJoinDialogOpen(true);
  };

  return (
    <div className="app-container">
      {/* 顶部导航栏 */}
      <div className="header">
        <div className="header-title">家庭账本</div>
        <div className="header-actions">
          <button className="icon-button" onClick={handleCreateFamily}>
            <i className="fas fa-plus"></i>
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="main-content">
        {/* 如果正在加载，显示加载状态 */}
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : families.length === 0 ? (
          // 如果没有家庭，显示空状态
          <EmptyState 
            onCreateFamily={handleCreateFamily} 
            onJoinFamily={handleJoinFamily} 
          />
        ) : (
          // 显示家庭列表
          <FamilyList 
            families={families} 
            onCreateFamily={handleCreateFamily} 
            onJoinFamily={handleJoinFamily} 
          />
        )}

        {/* 创建家庭对话框 */}
        <CreateFamilyDialog 
          isOpen={isCreateDialogOpen} 
          onClose={() => setIsCreateDialogOpen(false)} 
        />

        {/* 加入家庭对话框 */}
        <JoinFamilyDialog 
          isOpen={isJoinDialogOpen} 
          onClose={() => setIsJoinDialogOpen(false)} 
        />
      </div>

      {/* 底部导航栏 */}
      <BottomNavigation currentPath="/families" />
    </div>
  );
}
