"use client";

import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { FamilyList } from "@/components/families/family-list";
import { CreateFamilyDialog } from "@/components/families/create-family-dialog";
import { JoinFamilyDialog } from "@/components/families/join-family-dialog";
import { EmptyState } from "@/components/families/empty-state";
import { useFamilyStore } from "@/lib/stores/family-store";

export default function FamiliesPage() {
  const { families, isLoading, fetchFamilies } = useFamilyStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const handleCreateFamily = () => {
    setIsCreateDialogOpen(true);
  };

  const handleJoinFamily = () => {
    setIsJoinDialogOpen(true);
  };

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <PageContainer 
        title="家庭账本" 
        activeNavItem="profile"
      >
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </PageContainer>
    );
  }

  // 如果没有家庭，显示空状态
  if (families.length === 0) {
    return (
      <PageContainer 
        title="家庭账本" 
        activeNavItem="profile"
      >
        <EmptyState 
          onCreateFamily={handleCreateFamily} 
          onJoinFamily={handleJoinFamily} 
        />
        <CreateFamilyDialog 
          isOpen={isCreateDialogOpen} 
          onClose={() => setIsCreateDialogOpen(false)} 
        />
        <JoinFamilyDialog 
          isOpen={isJoinDialogOpen} 
          onClose={() => setIsJoinDialogOpen(false)} 
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title="家庭账本" 
      activeNavItem="profile"
    >
      <FamilyList 
        families={families} 
        onCreateFamily={handleCreateFamily} 
        onJoinFamily={handleJoinFamily} 
      />
      <CreateFamilyDialog 
        isOpen={isCreateDialogOpen} 
        onClose={() => setIsCreateDialogOpen(false)} 
      />
      <JoinFamilyDialog 
        isOpen={isJoinDialogOpen} 
        onClose={() => setIsJoinDialogOpen(false)} 
      />
    </PageContainer>
  );
}
