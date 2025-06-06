'use client';

import { InvitationData } from '@/types/family';
import { formatDate } from '@/lib/utils/date-utils';
import { toast } from 'sonner';

interface InvitationSectionProps {
  invitation: InvitationData | null;
  isLoading: boolean;
  onGenerateInvitation: (expiresInDays: number) => Promise<void>;
}

export function InvitationSection({
  invitation,
  isLoading,
  onGenerateInvitation,
}: InvitationSectionProps) {
  // 复制邀请链接
  const copyInviteLink = () => {
    if (!invitation) return;

    navigator.clipboard
      .writeText(invitation.url)
      .then(() => toast.success('邀请链接已复制到剪贴板'))
      .catch(() => toast.error('复制失败，请手动复制'));
  };

  // 分享邀请链接
  const shareInviteLink = () => {
    if (!invitation) return;

    if (navigator.share) {
      navigator
        .share({
          title: '加入我的家庭账本',
          text: '点击链接加入我的家庭账本',
          url: invitation.url,
        })
        .then(() => toast.success('分享成功'))
        .catch((error) => {
          if (error.name !== 'AbortError') {
            toast.error('分享失败');
          }
        });
    } else {
      copyInviteLink();
    }
  };

  // 如果没有邀请链接且不在加载中，显示生成按钮
  if (!invitation && !isLoading) {
    return (
      <div className="invitation-section">
        <button
          className="invitation-generate-btn"
          onClick={() => onGenerateInvitation(0.33)} // 8小时 = 1/3天
        >
          <i className="fas fa-user-plus"></i>
          生成邀请码
        </button>
      </div>
    );
  }

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="invitation-section">
        <div className="invitation-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="invitation-section">
      <div className="invitation-header">
        <div className="invitation-icon">
          <i className="fas fa-user-plus"></i>
        </div>
        <div className="invitation-title">邀请码</div>
      </div>

      <div className="invitation-content">
        <div className="invitation-code">{invitation?.invitationCode}</div>
        <div className="invitation-expiry">
          有效期至 {invitation ? formatDate(invitation.expiresAt) : ''} (8小时)
        </div>
      </div>

      <div className="invitation-actions">
        <button className="invitation-action-btn invitation-copy-btn" onClick={copyInviteLink}>
          <i className="fas fa-copy"></i>
          <span>复制链接</span>
        </button>
        <button className="invitation-action-btn invitation-share-btn" onClick={shareInviteLink}>
          <i className="fas fa-share-alt"></i>
          <span>分享</span>
        </button>
      </div>
    </div>
  );
}
