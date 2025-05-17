"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { FamilyHeader } from "@/components/families/detail/family-header";
import { MemberList } from "@/components/families/detail/member-list";
import { FamilyStatistics } from "@/components/families/detail/family-statistics";
import { RecentTransactions } from "@/components/families/detail/recent-transactions";
import { FamilyManagement } from "@/components/families/detail/family-management";
import { InvitationDialog } from "@/components/families/detail/invitation-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useFamilyDetailStore } from "@/lib/stores/family-detail-store";

export default function FamilyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const familyId = params.id as string;
  
  const { 
    family, 
    isLoading, 
    error, 
    fetchFamilyDetail,
    updateFamily,
    leaveFamily,
    deleteFamily
  } = useFamilyDetailStore();

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (familyId) {
      fetchFamilyDetail(familyId);
    }
  }, [familyId, fetchFamilyDetail]);

  // 处理邀请成员
  const handleInviteMember = () => {
    setIsInviteDialogOpen(true);
  };

  // 处理退出家庭
  const handleLeaveFamily = async () => {
    setIsProcessing(true);
    const success = await leaveFamily(familyId);
    setIsProcessing(false);
    
    if (success) {
      setIsLeaveDialogOpen(false);
      router.push("/families");
    }
  };

  // 处理解散家庭
  const handleDeleteFamily = async () => {
    setIsProcessing(true);
    const success = await deleteFamily(familyId);
    setIsProcessing(false);
    
    if (success) {
      setIsDeleteDialogOpen(false);
      router.push("/families");
    }
  };

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <PageContainer 
        title="家庭详情" 
        showBackButton
        activeNavItem="profile"
      >
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </PageContainer>
    );
  }

  // 如果发生错误，显示错误信息
  if (error || !family) {
    return (
      <PageContainer 
        title="家庭详情" 
        showBackButton
        activeNavItem="profile"
      >
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <i className="fas fa-exclamation-triangle text-red-500 text-xl"></i>
          </div>
          <h2 className="text-xl font-semibold mb-2">无法加载家庭信息</h2>
          <p className="text-gray-500 mb-6">{error || "找不到该家庭或您没有权限访问"}</p>
          <button
            className="btn-primary py-2 px-4 rounded-lg"
            onClick={() => router.push("/families")}
          >
            返回家庭列表
          </button>
        </div>
      </PageContainer>
    );
  }

  // 判断当前用户是否为管理员
  const isAdmin = family.members.some(
    member => member.userId === family.creator?.id && member.role === "ADMIN"
  );

  return (
    <PageContainer 
      title="家庭详情" 
      showBackButton
      activeNavItem="profile"
    >
      <FamilyHeader 
        family={family} 
        isAdmin={isAdmin}
        onUpdate={updateFamily}
      />
      
      <MemberList 
        members={family.members} 
        isAdmin={isAdmin}
        onInvite={handleInviteMember}
      />
      
      <FamilyStatistics familyId={familyId} />
      
      <RecentTransactions familyId={familyId} />
      
      <FamilyManagement 
        isAdmin={isAdmin}
        familyId={familyId}
        onLeave={() => setIsLeaveDialogOpen(true)}
        onDelete={() => setIsDeleteDialogOpen(true)}
      />
      
      <InvitationDialog 
        isOpen={isInviteDialogOpen} 
        onClose={() => setIsInviteDialogOpen(false)}
        familyId={familyId}
      />
      
      <ConfirmDialog
        isOpen={isLeaveDialogOpen}
        title="退出家庭"
        message={`确定要退出"${family.name}"吗？此操作无法撤销。`}
        confirmText={isProcessing ? "处理中..." : "退出"}
        cancelText="取消"
        onConfirm={handleLeaveFamily}
        onCancel={() => setIsLeaveDialogOpen(false)}
        isDangerous
      />
      
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="解散家庭"
        message={`确定要解散"${family.name}"吗？此操作将永久删除该家庭及其所有数据，无法撤销。`}
        confirmText={isProcessing ? "处理中..." : "解散"}
        cancelText="取消"
        onConfirm={handleDeleteFamily}
        onCancel={() => setIsDeleteDialogOpen(false)}
        isDangerous
      />
    </PageContainer>
  );
}
