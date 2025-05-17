'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { MemberList } from '@/components/families/members/member-list';
import { InvitationSection } from '@/components/families/members/invitation-section';
import { MemberStatistics } from '@/components/families/members/member-statistics';
import { useFamilyMembersStore } from '@/lib/stores/family-members-store';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Role } from '@/lib/stores/family-store';
import { toast } from 'sonner';

export default function FamilyMembersPage() {
  const params = useParams();
  const router = useRouter();
  const familyId = params.id as string;
  
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string, name: string } | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState<{ memberId: string, name: string, role: Role } | null>(null);
  
  const { 
    members, 
    totalExpense,
    period,
    userPermissions,
    invitation,
    isLoading, 
    isRoleUpdating,
    isRemoving,
    isInvitationLoading,
    error,
    setFamilyId,
    fetchMembers,
    updateMemberRole,
    removeMember,
    generateInvitation,
    setPeriod
  } = useFamilyMembersStore();

  // 设置家庭ID并加载数据
  useEffect(() => {
    if (familyId) {
      setFamilyId(familyId);
      fetchMembers();
    }
  }, [familyId, setFamilyId, fetchMembers]);

  // 处理错误
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // 处理角色更改
  const handleRoleChange = (memberId: string, name: string, newRole: Role) => {
    setRoleChangeData({ memberId, name, role: newRole });
    setShowRoleDialog(true);
  };

  // 确认角色更改
  const confirmRoleChange = async () => {
    if (!roleChangeData) return;
    
    const success = await updateMemberRole(roleChangeData.memberId, roleChangeData.role);
    if (success) {
      toast.success(`已将 ${roleChangeData.name} 的角色更改为${roleChangeData.role === 'ADMIN' ? '管理员' : '成员'}`);
      setShowRoleDialog(false);
    }
  };

  // 处理移除成员
  const handleRemoveMember = (memberId: string, name: string) => {
    setMemberToRemove({ id: memberId, name });
    setShowRemoveDialog(true);
  };

  // 确认移除成员
  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    
    const success = await removeMember(memberToRemove.id);
    if (success) {
      toast.success(`已移除成员 ${memberToRemove.name}`);
      setShowRemoveDialog(false);
    }
  };

  // 处理生成邀请链接
  const handleGenerateInvitation = async (expiresInDays = 7) => {
    const invitation = await generateInvitation(expiresInDays);
    if (invitation) {
      toast.success('邀请链接已生成');
    }
  };

  // 处理时间范围切换
  const handlePeriodChange = (newPeriod: 'month' | 'last_month' | 'all') => {
    setPeriod(newPeriod);
  };

  // 如果正在加载，显示加载状态
  if (isLoading && members.length === 0) {
    return (
      <PageContainer 
        title="成员管理" 
        showBackButton
        backUrl={`/families/${familyId}`}
        activeNavItem="profile"
      >
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title="成员管理" 
      showBackButton
      backUrl={`/families/${familyId}`}
      activeNavItem="profile"
      rightAction={
        userPermissions.canInvite ? (
          <button 
            className="icon-button" 
            onClick={() => handleGenerateInvitation()}
            disabled={isInvitationLoading}
          >
            <i className="fas fa-user-plus"></i>
          </button>
        ) : null
      }
    >
      {/* 成员列表 */}
      <div className="members-list">
        <MemberList 
          members={members}
          userPermissions={userPermissions}
          onRoleChange={handleRoleChange}
          onRemoveMember={handleRemoveMember}
        />
      </div>
      
      {/* 邀请新成员区域 */}
      {userPermissions.canInvite && (
        <>
          <div className="section-title">邀请新成员</div>
          <InvitationSection 
            invitation={invitation}
            isLoading={isInvitationLoading}
            onGenerateInvitation={handleGenerateInvitation}
          />
        </>
      )}
      
      {/* 成员统计 */}
      <div className="section-title">成员统计</div>
      <MemberStatistics 
        members={members}
        totalExpense={totalExpense}
        period={period}
        onPeriodChange={handlePeriodChange}
      />
      
      {/* 角色更改确认对话框 */}
      <ConfirmDialog
        isOpen={showRoleDialog}
        title="更改角色"
        message={roleChangeData ? `确定要将 ${roleChangeData.name} 的角色更改为${roleChangeData.role === 'ADMIN' ? '管理员' : '成员'}吗？` : ''}
        confirmText={isRoleUpdating ? "处理中..." : "确认"}
        cancelText="取消"
        onConfirm={confirmRoleChange}
        onCancel={() => setShowRoleDialog(false)}
      />
      
      {/* 移除成员确认对话框 */}
      <ConfirmDialog
        isOpen={showRemoveDialog}
        title="移除成员"
        message={memberToRemove ? `确定要将 ${memberToRemove.name} 从家庭中移除吗？此操作无法撤销。` : ''}
        confirmText={isRemoving ? "处理中..." : "移除"}
        cancelText="取消"
        onConfirm={confirmRemoveMember}
        onCancel={() => setShowRemoveDialog(false)}
        isDangerous
      />
    </PageContainer>
  );
}
