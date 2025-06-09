'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { MemberList } from '@/components/families/members/member-list';
import { InvitationSection } from '@/components/families/members/invitation-section';
import { InvitationHistory } from '@/components/families/members/invitation-history';
import { MemberStatistics } from '@/components/families/members/member-statistics';
import { useFamilyMembersStore } from '@/lib/stores/family-members-store';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Role } from '@/types/family';
import { toast } from 'sonner';
import '../app/families/families.css';
import './family-members-modal.css';

interface FamilyMembersModalProps {
  familyId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function FamilyMembersModal({
  familyId,
  isOpen,
  onClose
}: FamilyMembersModalProps) {
  const { isAuthenticated, token } = useAuthStore();

  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState<{
    memberId: string;
    name: string;
    role: Role;
  } | null>(null);

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
    setPeriod,
  } = useFamilyMembersStore();

  // 设置家庭ID并加载数据
  useEffect(() => {
    if (isOpen && familyId && familyId !== 'placeholder' && token) {
      console.log('设置家庭ID:', familyId);
      setFamilyId(familyId);

      // 加载成员数据
      fetchMembers(token)
        .then(() => {
          console.log('成员数据加载完成');
        })
        .catch((error) => {
          console.error('加载成员数据失败:', error);
        });

      // 加载邀请列表
      console.log('开始获取邀请列表...');
      fetchInvitations(token)
        .then((result) => {
          console.log('邀请列表获取结果:', result);
        })
        .catch((error) => {
          console.error('获取邀请列表失败:', error);
        });
    }
  }, [isOpen, familyId, token, setFamilyId, fetchMembers, fetchInvitations]);

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
      toast.success(
        `已将 ${roleChangeData.name} 的角色更改为${roleChangeData.role === 'ADMIN' ? '管理员' : '成员'}`,
      );
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
      fetchMembers(token);
    }
  };

  // 隐藏所有可能的顶部工具栏和底部导航栏
  useEffect(() => {
    if (isOpen) {
      // 添加body类
      document.body.classList.add('modal-open');

      // 查找所有可能的头部元素
      const selectors = [
        '.app-container .header',
        '.header',
        '.page-header',
        '.ios-header',
        '.capacitor-header',
        '.top-bar',
        '.navigation-header',
        '.app-header',
        // iOS Capacitor 特定选择器
        '.capacitor-ios .header',
        '.ios-app .header',
        // 可能的状态栏
        '.status-bar',
        '.capacitor-status-bar'
      ];

      const hiddenElements: HTMLElement[] = [];

      // 隐藏所有找到的头部元素
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const htmlElement = element as HTMLElement;
          if (htmlElement && htmlElement.style.display !== 'none') {
            htmlElement.style.display = 'none';
            hiddenElements.push(htmlElement);
          }
        });
      });

      // 隐藏底部导航栏
      const bottomNavSelectors = [
        '.bottom-nav',
        '.bottom-navigation',
        '.tab-bar',
        '.capacitor-tab-bar'
      ];

      bottomNavSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const htmlElement = element as HTMLElement;
          if (htmlElement && htmlElement.style.display !== 'none') {
            htmlElement.style.display = 'none';
            hiddenElements.push(htmlElement);
          }
        });
      });

      // 特殊处理：隐藏 body 上可能的工具栏
      const body = document.body;
      const originalOverflow = body.style.overflow;
      body.style.overflow = 'hidden';

      // iOS Capacitor 特殊处理：隐藏可能的原生工具栏
      if (typeof window !== 'undefined' && (window as any).Capacitor) {
        // 尝试隐藏 Capacitor 的状态栏
        try {
          const { StatusBar } = (window as any).Capacitor.Plugins;
          if (StatusBar) {
            StatusBar.hide();
          }
        } catch (error) {
          console.log('StatusBar plugin not available:', error);
        }
      }

      return () => {
        // 移除body类
        document.body.classList.remove('modal-open');

        // 恢复所有隐藏的元素
        hiddenElements.forEach(element => {
          element.style.display = '';
        });

        // 恢复 body 样式
        body.style.overflow = originalOverflow;

        // 恢复状态栏
        if (typeof window !== 'undefined' && (window as any).Capacitor) {
          try {
            const { StatusBar } = (window as any).Capacitor.Plugins;
            if (StatusBar) {
              StatusBar.show();
            }
          } catch (error) {
            console.log('StatusBar plugin not available:', error);
          }
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 如果未认证，不显示任何内容
  if (!isAuthenticated) {
    return null;
  }

  // 如果是占位符，显示占位符信息
  if (familyId === 'placeholder') {
    return (
      <div className="modal-overlay" style={{ zIndex: 9999999 }}>
        <div className="modal-container">
          <div className="modal-header">
            <button className="modal-back-button" onClick={onClose}>
              <i className="fas fa-arrow-left"></i>
            </button>
            <h1 className="modal-title">成员管理</h1>
          </div>
          <div className="modal-content">
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="text-muted-foreground">
                这是一个静态导出的占位符页面。在实际应用中，请通过正确的路由访问成员管理页面。
              </div>
              <button
                className="btn btn-primary"
                onClick={onClose}
              >
                返回
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 如果正在加载，显示加载状态
  if (isLoading && members.length === 0) {
    return (
      <div className="modal-overlay" style={{ zIndex: 9999999 }}>
        <div className="modal-container">
          <div className="modal-header">
            <button className="modal-back-button" onClick={onClose}>
              <i className="fas fa-arrow-left"></i>
            </button>
            <h1 className="modal-title">成员管理</h1>
          </div>
          <div className="modal-content">
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 全屏模态框覆盖层 */}
      <div className="modal-overlay" style={{ zIndex: 9999999 }}>
        <div className="modal-container">
          {/* 模态框头部 */}
          <div className="modal-header">
            <button className="modal-back-button" onClick={onClose}>
              <i className="fas fa-arrow-left"></i>
            </button>
            <h1 className="modal-title">成员管理</h1>
            {userPermissions.canInvite && (
              <button
                className="modal-action-button"
                onClick={() => handleGenerateInvitation(0.33)} // 8小时 = 1/3天
                disabled={isInvitationLoading}
              >
                <i className="fas fa-user-plus"></i>
              </button>
            )}
          </div>

          {/* 模态框内容 */}
          <div className="modal-content">
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
          </div>
        </div>
      </div>

      {/* 角色更改确认对话框 */}
      <ConfirmDialog
        isOpen={showRoleDialog}
        title="更改角色"
        message={
          roleChangeData
            ? `确定要将 ${roleChangeData.name} 的角色更改为${roleChangeData.role === 'ADMIN' ? '管理员' : '成员'}吗？`
            : ''
        }
        confirmText={isRoleUpdating ? '处理中...' : '确认'}
        cancelText="取消"
        onConfirm={confirmRoleChange}
        onCancel={() => setShowRoleDialog(false)}
      />

      {/* 移除成员确认对话框 */}
      <ConfirmDialog
        isOpen={showRemoveDialog}
        title="移除成员"
        message={
          memberToRemove ? `确定要将 ${memberToRemove.name} 从家庭中移除吗？此操作无法撤销。` : ''
        }
        confirmText={isRemoving ? '处理中...' : '移除'}
        cancelText="取消"
        onConfirm={confirmRemoveMember}
        onCancel={() => setShowRemoveDialog(false)}
        isDangerous
      />
    </>
  );
}
