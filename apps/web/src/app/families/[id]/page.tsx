"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

interface FamilyDetailPageProps {
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
}

interface Family {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  members: FamilyMember[];
  memberCount: number;
}

export default function FamilyDetailPage({ params }: FamilyDetailPageProps) {
  const router = useRouter();
  const { id: familyId } = params;
  const [family, setFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 获取家庭详情
  useEffect(() => {
    const fetchFamilyDetail = async () => {
      try {
        const response = await fetch(`/api/families/${familyId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setFamily(data);
        } else {
          toast.error('获取家庭详情失败');
          router.push('/families');
        }
      } catch (error) {
        console.error('获取家庭详情失败:', error);
        toast.error('获取家庭详情失败');
        router.push('/families');
      } finally {
        setIsLoading(false);
      }
    };

    if (familyId) {
      fetchFamilyDetail();
    }
  }, [familyId, router]);

  // 处理退出家庭
  const handleLeaveFamily = async () => {
    setIsProcessing(true);
    
    try {
      const response = await fetch(`/api/families/${familyId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('已退出家庭');
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
      setShowLeaveDialog(false);
    }
  };

  // 处理解散家庭
  const handleDeleteFamily = async () => {
    setIsProcessing(true);
    
    try {
      const response = await fetch(`/api/families/${familyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('家庭已解散');
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
      setShowDeleteDialog(false);
    }
  };

  // 判断当前用户是否为管理员
  const isAdmin = family?.members.some(member => member.role === 'ADMIN') || false;

  if (isLoading) {
    return (
      <PageContainer
        title="家庭详情"
        showBackButton={true}
        activeNavItem="profile"
      >
        <div className="flex h-40 items-center justify-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      </PageContainer>
    );
  }

  if (!family) {
    return (
      <PageContainer
        title="家庭详情"
        showBackButton={true}
        activeNavItem="profile"
      >
        <div className="flex h-40 items-center justify-center">
          <p className="text-gray-500">家庭不存在</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="家庭详情"
      showBackButton={true}
      activeNavItem="profile"
    >
      {/* 家庭信息 */}
      <div className="family-header">
        <div className="family-info">
          <h2 className="family-name">{family.name}</h2>
          {family.description && (
            <p className="family-description">{family.description}</p>
          )}
          <div className="family-stats">
            <span className="member-count">{family.memberCount} 位成员</span>
            <span className="created-date">
              创建于 {new Date(family.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* 成员列表 */}
      <div className="members-section">
        <h3 className="section-title">家庭成员</h3>
        <div className="members-list">
          {family.members.map((member) => (
            <div key={member.id} className="member-item">
              <div className="member-info">
                <div className="member-name">{member.username}</div>
                <div className="member-email">{member.email}</div>
              </div>
              <div className="member-role">
                {member.role === 'ADMIN' ? '管理员' : '成员'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 管理操作 */}
      <div className="management-section">
        <h3 className="section-title">家庭管理</h3>
        <div className="management-actions">
          <button
            className="action-button leave-button"
            onClick={() => setShowLeaveDialog(true)}
          >
            <i className="fas fa-sign-out-alt"></i>
            退出家庭
          </button>
          
          {isAdmin && (
            <button
              className="action-button delete-button"
              onClick={() => setShowDeleteDialog(true)}
            >
              <i className="fas fa-trash-alt"></i>
              解散家庭
            </button>
          )}
        </div>
      </div>

      {/* 退出家庭确认对话框 */}
      <ConfirmDialog
        isOpen={showLeaveDialog}
        title="退出家庭"
        message={`确定要退出"${family.name}"吗？此操作无法撤销。`}
        confirmText={isProcessing ? "处理中..." : "退出"}
        cancelText="取消"
        onConfirm={handleLeaveFamily}
        onCancel={() => setShowLeaveDialog(false)}
        isDangerous
      />

      {/* 解散家庭确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="解散家庭"
        message={`确定要解散"${family.name}"吗？此操作将永久删除该家庭及其所有数据，无法撤销。`}
        confirmText={isProcessing ? "处理中..." : "解散"}
        cancelText="取消"
        onConfirm={handleDeleteFamily}
        onCancel={() => setShowDeleteDialog(false)}
        isDangerous
      />
    </PageContainer>
  );
}
