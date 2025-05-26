'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@zhiweijz/web';
import { PageContainer } from '@/components/layout/page-container';
import { MemberList } from '@/components/families/members/member-list';
import { InvitationSection } from '@/components/families/members/invitation-section';
import { InvitationHistory } from '@/components/families/members/invitation-history';
import { MemberStatistics } from '@/components/families/members/member-statistics';
import { useFamilyMembersStore } from '@/lib/stores/family-members-store';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Role } from '@/types/family';
import { toast } from 'sonner';
import "../../families.css";

interface FamilyMembersPageProps {
  params: {
    id: string;
  };
}

export default function FamilyMembersPage({ params }: FamilyMembersPageProps) {
  const router = useRouter();
  const { id: familyId } = params;
  const { isAuthenticated, token } = useAuthStore();

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
    invitations,
    isLoading,
    isRoleUpdating,
    isRemoving,
    isInvitationLoading,
    isInvitationsLoading,
    error,
    setFamilyId,
    fetchMembers,
    fetchInvitations,
    updateMemberRole,
    removeMember,
    generateInvitation,
    setPeriod
  } = useFamilyMembersStore();

  // 设置家庭ID并加载数据
  useEffect(() => {
    if (familyId && token) {
      console.log('设置家庭ID:', familyId);
      setFamilyId(familyId);

      // 加载成员数据
      fetchMembers(token).then(() => {
        console.log('成员数据加载完成');
      }).catch(error => {
        console.error('加载成员数据失败:', error);
      });

      // 加载邀请列表
      console.log('开始获取邀请列表...');
      fetchInvitations(token).then(result => {
        console.log('邀请列表获取结果:', result);
      }).catch(error => {
        console.error('获取邀请列表失败:', error);
      });
    }
  }, [familyId, token, setFamilyId, fetchMembers, fetchInvitations]);

  // 检查用户是否已认证
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

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
    if (!roleChangeData || !token) return;

    const success = await updateMemberRole(token, roleChangeData.memberId, roleChangeData.role);
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
    if (!memberToRemove || !token) return;

    const success = await removeMember(token, memberToRemove.id);
    if (success) {
      toast.success(`已移除成员 ${memberToRemove.name}`);
      setShowRemoveDialog(false);
    }
  };

  // 处理生成邀请链接
  const handleGenerateInvitation = async (expiresInDays = 0.33) => {
    if (!token) return;

    const invitation = await generateInvitation(token, expiresInDays);
    if (invitation) {
      toast.success('邀请码已生成');
    }
  };

  // 处理时间范围切换
  const handlePeriodChange = (newPeriod: 'month' | 'last_month' | 'all') => {
    setPeriod(newPeriod);
    // 重新获取成员数据
    if (token) {
      fetchMemberStatistics(token, newPeriod);
    }
  };

  // 如果未认证，不显示任何内容
  if (!isAuthenticated) {
    return null;
  }

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
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
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
      rightActions={
        userPermissions.canInvite ? (
          <button
            className="icon-button"
            onClick={() => handleGenerateInvitation(0.33)} // 8小时 = 1/3天
            disabled={isInvitationLoading}
          >
            <i className="fas fa-user-plus"></i>
          </button>
        ) : undefined
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

      {/* 邀请历史 */}
      {userPermissions.canInvite && (
        <>
          <InvitationHistory
            invitations={invitations}
            isLoading={isInvitationsLoading}
            onRefresh={() => token && fetchInvitations(token)}
          />
        </>
      )}

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
