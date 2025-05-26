'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';

interface InvitationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
}

interface InvitationData {
  id: string;
  familyId: string;
  invitationCode: string;
  expiresAt: string;
  url: string;
  createdAt: string;
}

export function InvitationDialog({ isOpen, onClose, familyId }: InvitationDialogProps) {
  const { token } = useAuthStore();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(0.33); // 默认8小时

  // 生成邀请链接
  const generateInvitation = async () => {
    if (!token) {
      toast.error('未提供认证令牌');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/families/${familyId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ expiresInDays }),
      });

      if (response.ok) {
        const data = await response.json();
        setInvitation(data);
        toast.success('邀请链接已生成');
      } else {
        const error = await response.json();
        toast.error(error.message || '生成邀请链接失败');
      }
    } catch (error) {
      console.error('生成邀请链接失败:', error);
      toast.error('生成邀请链接失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 复制邀请链接
  const copyInviteLink = async () => {
    if (!invitation) return;

    try {
      await navigator.clipboard.writeText(invitation.url);
      toast.success('邀请链接已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      toast.error('复制失败，请手动复制');
    }
  };

  // 复制邀请码
  const copyInviteCode = async () => {
    if (!invitation) return;

    try {
      await navigator.clipboard.writeText(invitation.invitationCode);
      toast.success('邀请码已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      toast.error('复制失败，请手动复制');
    }
  };

  // 分享邀请链接
  const shareInviteLink = async () => {
    if (!invitation) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: '家庭账本邀请',
          text: '邀请您加入我的家庭账本',
          url: invitation.url,
        });
      } catch (error) {
        console.error('分享失败:', error);
        // 如果分享失败，回退到复制
        copyInviteLink();
      }
    } else {
      // 如果不支持分享，直接复制
      copyInviteLink();
    }
  };

  // 格式化过期时间
  const formatExpiryTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取过期时间选项
  const getExpiryOptions = () => [
    { value: 0.33, label: '8小时' },
    { value: 1, label: '1天' },
    { value: 3, label: '3天' },
    { value: 7, label: '7天' },
  ];

  // 重置状态
  const handleClose = () => {
    setInvitation(null);
    setExpiresInDays(0.33);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div className="dialog-content invitation-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3 className="dialog-title">邀请成员</h3>
          <button className="dialog-close" onClick={handleClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="dialog-body">
          {!invitation ? (
            // 生成邀请界面
            <div className="invitation-generator">
              <div className="generator-icon">
                <i className="fas fa-user-plus"></i>
              </div>
              <h4>生成邀请链接</h4>
              <p>生成邀请链接，让其他人加入您的家庭账本</p>

              <div className="form-group">
                <label className="form-label">有效期</label>
                <select
                  className="form-select"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                >
                  {getExpiryOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn-primary generate-button"
                onClick={generateInvitation}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic"></i>
                    <span>生成邀请链接</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            // 显示邀请信息
            <div className="invitation-display">
              <div className="invitation-success">
                <i className="fas fa-check-circle"></i>
                <h4>邀请链接已生成</h4>
              </div>

              <div className="invitation-info">
                <div className="info-item">
                  <label>邀请码</label>
                  <div className="code-display">
                    <span className="invite-code">{invitation.invitationCode}</span>
                    <button className="copy-button" onClick={copyInviteCode}>
                      <i className="fas fa-copy"></i>
                    </button>
                  </div>
                </div>

                <div className="info-item">
                  <label>邀请链接</label>
                  <div className="link-display">
                    <span className="invite-link">{invitation.url}</span>
                    <button className="copy-button" onClick={copyInviteLink}>
                      <i className="fas fa-copy"></i>
                    </button>
                  </div>
                </div>

                <div className="info-item">
                  <label>有效期至</label>
                  <span className="expiry-time">{formatExpiryTime(invitation.expiresAt)}</span>
                </div>
              </div>

              <div className="invitation-actions">
                <button className="action-button copy" onClick={copyInviteLink}>
                  <i className="fas fa-copy"></i>
                  <span>复制链接</span>
                </button>
                <button className="action-button share" onClick={shareInviteLink}>
                  <i className="fas fa-share-alt"></i>
                  <span>分享</span>
                </button>
              </div>

              <div className="invitation-tip">
                <i className="fas fa-info-circle"></i>
                <span>将邀请码或链接发送给您想邀请的人，他们可以通过此链接加入您的家庭账本</span>
              </div>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="btn-secondary" onClick={handleClose}>
            {invitation ? '完成' : '取消'}
          </button>
        </div>
      </div>
    </div>
  );
}
