'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PageContainer } from '@/components/layout/page-container';
import { FamilyHeader } from '@/components/families/detail/family-header';
import { MemberList } from '@/components/families/detail/member-list';
import { CustodialMembers } from '@/components/families/detail/custodial-members';
import { FamilyStatistics } from '@/components/families/detail/family-statistics';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api-client';
import '../families.css';

interface FamilyDetailClientProps {
  params: {
    id: string;
  };
}

interface FamilyMember {
  id: string;
  userId: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  name: string;
  createdAt: string;
}

interface Family {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  members: FamilyMember[];
  memberCount: number;
  creator?: {
    id: string;
  };
}

export default function FamilyDetailClient({ params }: FamilyDetailClientProps) {
  const router = useRouter();
  const { id: familyId } = params;
  const { token, isAuthenticated } = useAuthStore();
  const [family, setFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 获取家庭详情
  useEffect(() => {
    const fetchFamilyDetail = async () => {
      // 如果是占位符，不执行数据获取
      if (familyId === 'placeholder') {
        setError('这是一个静态导出的占位符页面。在实际应用中，请通过正确的路由访问家庭详情页面。');
        setIsLoading(false);
        return;
      }

      if (!token) {
        setError('未提供认证令牌');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await fetchApi(`/api/families/${familyId}`);

        if (response.ok) {
          const data = await response.json();
          setFamily(data);
        } else {
          const errorData = await response.json();
          setError(errorData.message || '获取家庭详情失败');
        }
      } catch (error) {
        console.error('获取家庭详情失败:', error);
        setError('获取家庭详情失败');
      } finally {
        setIsLoading(false);
      }
    };

    if (familyId && isAuthenticated) {
      fetchFamilyDetail();
    }
  }, [familyId, token, isAuthenticated]);

  // 更新家庭信息
  const updateFamily = async (id: string, data: { name: string; description?: string }) => {
    if (!token) {
      toast.error('未提供认证令牌');
      return false;
    }

    try {
      const response = await fetchApi(`/api/families/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const updatedFamily = await response.json();
        setFamily(updatedFamily);
        toast.success('家庭信息更新成功');
        return true;
      } else {
        const error = await response.json();
        toast.error(error.message || '更新家庭信息失败');
        return false;
      }
    } catch (error) {
      console.error('更新家庭信息失败:', error);
      toast.error('更新家庭信息失败');
      return false;
    }
  };

  // 处理退出家庭
  const handleLeaveFamily = async () => {
    if (!token) {
      toast.error('未提供认证令牌');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetchApi(`/api/families/${familyId}/leave`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('已退出家庭');
        setIsLeaveDialogOpen(false);
        router.push('/families');
      } else {
        const error = await response.json();
        toast.error(error.message || '退出家庭失败');
      }
    } catch (error) {
      console.error('退出家庭失败:', error);
      toast.error('退出家庭失败');
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理解散家庭
  const handleDeleteFamily = async () => {
    if (!token) {
      toast.error('未提供认证令牌');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetchApi(`/api/families/${familyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('家庭已解散');
        setIsDeleteDialogOpen(false);
        router.push('/families');
      } else {
        const error = await response.json();
        toast.error(error.message || '解散家庭失败');
      }
    } catch (error) {
      console.error('解散家庭失败:', error);
      toast.error('解散家庭失败');
    } finally {
      setIsProcessing(false);
    }
  };

  // 判断当前用户是否为管理员
  const isAdmin =
    family?.members.some(
      (member) => member.userId === family.creator?.id && member.role === 'ADMIN',
    ) || false;

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <PageContainer title="家庭详情" showBackButton activeNavItem="profile">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </PageContainer>
    );
  }

  // 如果发生错误，显示错误信息
  if (error || !family) {
    return (
      <PageContainer title="家庭详情" showBackButton activeNavItem="profile">
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <i className="fas fa-exclamation-triangle text-red-500 text-xl"></i>
          </div>
          <h2 className="text-xl font-semibold mb-2">无法加载家庭信息</h2>
          <p className="text-gray-500 mb-6">{error || '找不到该家庭或您没有权限访问'}</p>
          <button
            className="btn-primary py-2 px-4 rounded-lg"
            onClick={() => router.push('/families')}
          >
            返回家庭列表
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="家庭详情" showBackButton activeNavItem="profile">
      <FamilyHeader family={family} isAdmin={isAdmin} onUpdate={updateFamily} />

      <MemberList members={family.members} isAdmin={isAdmin} familyId={familyId} />

      <CustodialMembers familyId={familyId} isAdmin={isAdmin} />

      <FamilyStatistics familyId={familyId} />

      {/* 家庭管理操作 */}
      <div className="management-section">
        <div className="section-header">
          <div className="section-title">
            <i className="fas fa-cogs"></i>
            <span>家庭管理</span>
          </div>
        </div>

        <div className="danger-zone">
          <div className="danger-title">
            <i className="fas fa-exclamation-triangle"></i>
            <span>危险操作</span>
          </div>

          <div className="danger-actions">
            {isAdmin ? (
              <>
                <button
                  className="danger-button delete"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <i className="fas fa-trash-alt"></i>
                  <span>解散家庭</span>
                </button>
                <div className="warning-text">解散家庭将永久移除所有相关数据，此操作不可恢复。</div>
              </>
            ) : (
              <>
                <button className="danger-button leave" onClick={() => setIsLeaveDialogOpen(true)}>
                  <i className="fas fa-sign-out-alt"></i>
                  <span>退出家庭</span>
                </button>
                <div className="warning-text">退出家庭后，您将无法访问该家庭的数据。</div>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isLeaveDialogOpen}
        title="退出家庭"
        message={`确定要退出"${family.name}"吗？此操作无法撤销。`}
        confirmText={isProcessing ? '处理中...' : '退出'}
        cancelText="取消"
        onConfirm={handleLeaveFamily}
        onCancel={() => setIsLeaveDialogOpen(false)}
        isDangerous
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="解散家庭"
        message={`确定要解散"${family.name}"吗？此操作将永久删除该家庭及其所有数据，无法撤销。`}
        confirmText={isProcessing ? '处理中...' : '解散'}
        cancelText="取消"
        onConfirm={handleDeleteFamily}
        onCancel={() => setIsDeleteDialogOpen(false)}
        isDangerous
      />
    </PageContainer>
  );
}
